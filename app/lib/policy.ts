import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { getApiKeyByKey, getApiKeyScopeKeys, incrementApiKeyUsage } from "./api-key-service";
import { createDb } from "./db";
import { DEFAULT_ROUTE_POLICIES, POLICY_ACCESS, type PolicyAccess, type RoutePolicyDefinition } from "./permission-seed";
import { userHasAnyPermission } from "./permission-service";
import { routePolicies } from "./schema";
import type { Permission } from "./permissions";

export type AuthSource = "anonymous" | "session" | "api_key" | "internal";

export interface AuthIdentity {
  source: AuthSource;
  userId?: string;
  apiKeyId?: string;
}

export interface AuthorizationDecision {
  allowed: boolean;
  status: number;
  error?: string;
  identity: AuthIdentity;
  policy?: RoutePolicyDefinition;
  requestHeaders?: Headers;
}

function allowDecision(
  identity: AuthIdentity,
  policy: RoutePolicyDefinition,
  requestHeaders: Headers
): AuthorizationDecision {
  return { allowed: true, status: 200, identity, policy, requestHeaders };
}

function denyDecision(
  status: number,
  error: string,
  identity: AuthIdentity,
  requestHeaders: Headers,
  policy?: RoutePolicyDefinition
): AuthorizationDecision {
  return { allowed: false, status, error, identity, policy, requestHeaders };
}

function parsePermissions(value: string | null | undefined): Permission[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as Permission[];
}

function normalizePolicy(row: typeof routePolicies.$inferSelect): RoutePolicyDefinition {
  return {
    pathPattern: row.pathPattern,
    methods: row.methods,
    access: row.access as PolicyAccess,
    requiredPermissions: parsePermissions(row.requiredPermissions),
    allowApiKey: row.allowApiKey,
    allowInternal: row.allowInternal,
    priority: row.priority,
    enabled: row.enabled,
    description: row.description ?? "",
  };
}

export function methodMatches(policyMethods: string, method: string) {
  if (policyMethods === "*") return true;
  return policyMethods
    .split(",")
    .map((value) => value.trim().toUpperCase())
    .includes(method.toUpperCase());
}

export function pathMatches(pattern: string, pathname: string) {
  if (pattern === pathname) return true;
  if (pattern.endsWith(":path*")) {
    const prefix = pattern.slice(0, -":path*".length);
    return pathname.startsWith(prefix);
  }
  if (pattern.endsWith("*")) {
    return pathname.startsWith(pattern.slice(0, -1));
  }
  return false;
}

export function matchRoutePolicyFromList(
  policies: RoutePolicyDefinition[],
  pathname: string,
  method: string
) {
  return [...policies]
    .filter((policy) => policy.enabled && methodMatches(policy.methods, method) && pathMatches(policy.pathPattern, pathname))
    .sort((a, b) => b.priority - a.priority || b.pathPattern.length - a.pathPattern.length)[0];
}

async function getRoutePolicies(): Promise<RoutePolicyDefinition[]> {
  try {
    const db = await createDb();
    const rows = await db.query.routePolicies.findMany({
      where: eq(routePolicies.enabled, true),
    });

    if (!rows.length) return DEFAULT_ROUTE_POLICIES;
    return rows.map(normalizePolicy);
  } catch (error) {
    // 数据库策略不可用时使用内置默认策略，避免迁移前阻断公开配置接口和内部清理链路。
    console.error("Falling back to default route policies:", error);
    return DEFAULT_ROUTE_POLICIES;
  }
}

async function getInternalWorkerSecret() {
  try {
    const { env } = await getCloudflareContext();
    return env.INTERNAL_WORKER_SECRET || process.env.INTERNAL_WORKER_SECRET || "";
  } catch {
    return process.env.INTERNAL_WORKER_SECRET || "";
  }
}

async function resolveAuthIdentity(request: Request): Promise<{ identity: AuthIdentity; requestHeaders: Headers }> {
  const requestHeaders = new Headers(request.headers);
  // 客户端传入的身份头不可信，必须先移除，再由服务端鉴权流程重新写入。
  requestHeaders.delete("X-User-Id");
  requestHeaders.delete("X-Auth-Source");
  requestHeaders.delete("X-Api-Key-Id");

  const internalSecret = request.headers.get("X-Internal-Worker-Secret");
  if (internalSecret) {
    const expectedSecret = await getInternalWorkerSecret();
    requestHeaders.delete("X-Internal-Worker-Secret");
    if (expectedSecret && internalSecret === expectedSecret) {
      requestHeaders.set("X-Auth-Source", "internal");
      return { identity: { source: "internal" }, requestHeaders };
    }

    return { identity: { source: "anonymous" }, requestHeaders };
  }

  const apiKey = request.headers.get("X-API-Key");
  if (apiKey) {
    const record = await getApiKeyByKey(apiKey);
    if (!record?.user?.id) {
      return { identity: { source: "anonymous" }, requestHeaders };
    }

    try {
      await incrementApiKeyUsage(record.id);
    } catch (error) {
      console.error("Failed to record API key usage:", error);
    }

    requestHeaders.set("X-User-Id", record.user.id);
    requestHeaders.set("X-Auth-Source", "api_key");
    requestHeaders.set("X-Api-Key-Id", record.id);
    return {
      identity: { source: "api_key", userId: record.user.id, apiKeyId: record.id },
      requestHeaders,
    };
  }

  const session = await auth();
  if (session?.user?.id) {
    requestHeaders.set("X-Auth-Source", "session");
    return { identity: { source: "session", userId: session.user.id }, requestHeaders };
  }

  return { identity: { source: "anonymous" }, requestHeaders };
}

async function apiKeyHasRequiredScope(apiKeyId: string, requiredPermissions: Permission[]) {
  const scopeKeys = await getApiKeyScopeKeys(apiKeyId);
  if (!scopeKeys.length) return true;
  return requiredPermissions.some((permission) => scopeKeys.includes(permission));
}

export async function authorizeRequest(request: Request): Promise<AuthorizationDecision> {
  const { pathname } = new URL(request.url);
  const policies = await getRoutePolicies();
  const policy = matchRoutePolicyFromList(policies, pathname, request.method);
  const { identity, requestHeaders } = await resolveAuthIdentity(request);

  if (!policy) {
    return denyDecision(403, "未配置访问策略", identity, requestHeaders);
  }

  if (policy.access === POLICY_ACCESS.PUBLIC) {
    return allowDecision(identity, policy, requestHeaders);
  }

  if (identity.source === "anonymous") {
    return denyDecision(401, "未授权", identity, requestHeaders, policy);
  }

  if (identity.source === "internal") {
    if (policy.access === POLICY_ACCESS.INTERNAL || policy.allowInternal) {
      return allowDecision(identity, policy, requestHeaders);
    }
    return denyDecision(403, "内部服务无权访问该接口", identity, requestHeaders, policy);
  }

  if (identity.source === "api_key" && !policy.allowApiKey) {
    return denyDecision(403, "API Key 无权访问该接口", identity, requestHeaders, policy);
  }

  if (policy.access === POLICY_ACCESS.AUTHENTICATED) {
    return allowDecision(identity, policy, requestHeaders);
  }

  if (!identity.userId) {
    return denyDecision(401, "未授权", identity, requestHeaders, policy);
  }

  const hasPermission = await userHasAnyPermission(identity.userId, policy.requiredPermissions);
  if (!hasPermission) {
    return denyDecision(403, "权限不足", identity, requestHeaders, policy);
  }

  if (identity.source === "api_key" && identity.apiKeyId) {
    const hasScope = await apiKeyHasRequiredScope(identity.apiKeyId, policy.requiredPermissions);
    if (!hasScope) {
      return denyDecision(403, "API Key Scope 权限不足", identity, requestHeaders, policy);
    }
  }

  return allowDecision(identity, policy, requestHeaders);
}

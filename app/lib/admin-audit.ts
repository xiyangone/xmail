import { recordAdminAuditLog, type AdminAuditLogInput } from "./operations-log";
import type { Db } from "./db";

export interface AdminMutationAuditInput {
  request: Request;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
  metadata?: unknown;
  db?: Db;
}

export function extractAuditRequestContext(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

  return {
    ipAddress:
      request.headers.get("cf-connecting-ip")?.trim() ||
      request.headers.get("x-real-ip")?.trim() ||
      forwardedFor,
    userAgent: request.headers.get("user-agent")?.trim() || null,
  };
}

export async function recordAdminMutationAudit(input: AdminMutationAuditInput) {
  const { request, actorUserId, db, ...auditFields } = input;
  const requestContext = extractAuditRequestContext(request);
  const auditInput: AdminAuditLogInput = {
    actorUserId,
    ...auditFields,
    ...requestContext,
  };

  try {
    return await recordAdminAuditLog(auditInput, db);
  } catch (error) {
    // 审计失败不能回滚已经授权成功的管理操作，因此这里只记录错误并返回 null。
    console.error("Failed to record admin audit log:", error);
    return null;
  }
}

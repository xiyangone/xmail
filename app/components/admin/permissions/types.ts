export type PolicyAccess = "public" | "authenticated" | "permission" | "internal";

export interface PermissionAdminPermission {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isSystem: boolean;
}

export interface PermissionAdminRole {
  id: string;
  name: string;
  description: string | null;
}

export interface PermissionAdminRolePermission {
  roleId: string;
  permissionKey: string;
}

export interface PermissionAdminRoutePolicy {
  id: string;
  pathPattern: string;
  methods: string;
  access: PolicyAccess;
  requiredPermissions: string | null;
  allowApiKey: boolean;
  allowInternal: boolean;
  priority: number;
  enabled: boolean;
  description: string | null;
}

export interface PermissionAdminApiKey {
  id: string;
  name: string;
  userId: string;
  enabled: boolean;
}

export interface PermissionAdminApiKeyScope {
  apiKeyId: string;
  permissionKey: string;
}

export interface PermissionAdminData {
  permissions: PermissionAdminPermission[];
  roles: PermissionAdminRole[];
  rolePermissions: PermissionAdminRolePermission[];
  routePolicies: PermissionAdminRoutePolicy[];
  apiKeys: PermissionAdminApiKey[];
  apiKeyScopes: PermissionAdminApiKeyScope[];
  canManage: boolean;
}

export function parsePermissionList(value: string | null | undefined) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

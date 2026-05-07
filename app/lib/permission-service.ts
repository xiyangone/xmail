import { and, eq, inArray } from "drizzle-orm";
import { createDb, type Db } from "./db";
import { permissions, rolePermissions, routePolicies, userRoles } from "./schema";
import {
  DEFAULT_PERMISSION_DEFINITIONS,
  DEFAULT_ROUTE_POLICIES,
  getAllPermissionKeys,
  getDefaultRolePermissions,
  isKnownRole,
} from "./permission-seed";
import { hasPermission, ROLES, type Permission, type Role } from "./permissions";

export interface UserPermissionSnapshot {
  roles: Role[];
  permissionKeys: Permission[];
  source: "database" | "fallback";
}

function uniquePermissions(values: string[]): Permission[] {
  return Array.from(new Set(values)).filter((value): value is Permission =>
    getAllPermissionKeys().includes(value as Permission)
  );
}

export async function ensureRoleDefaultPermissions(db: Db, roleId: string, roleName: string) {
  if (!isKnownRole(roleName)) return;

  const defaults = getDefaultRolePermissions(roleName);
  for (const permissionKey of defaults) {
    try {
      await db
        .insert(rolePermissions)
        .values({ roleId, permissionKey })
        .onConflictDoNothing();
    } catch (error) {
      console.error(`Failed to seed default permissions for role ${roleName}:`, error);
      return;
    }
  }
}

export async function ensurePermissionSeeded(db?: Db) {
  const database = db ?? (await createDb());

  for (const permission of DEFAULT_PERMISSION_DEFINITIONS) {
    await database
      .insert(permissions)
      .values({
        key: permission.key,
        name: permission.name,
        description: permission.description,
        isSystem: true,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: permissions.key,
        set: {
          name: permission.name,
          description: permission.description,
          isSystem: true,
          updatedAt: new Date(),
        },
      });
  }

  const roleRows = await database.query.roles.findMany();
  for (const role of roleRows) {
    await ensureRoleDefaultPermissions(database, role.id, role.name);
  }

  for (const policy of DEFAULT_ROUTE_POLICIES) {
    const existing = await database.query.routePolicies.findFirst({
      where: and(eq(routePolicies.pathPattern, policy.pathPattern), eq(routePolicies.methods, policy.methods)),
    });

    if (existing) continue;

    await database.insert(routePolicies).values({
      pathPattern: policy.pathPattern,
      methods: policy.methods,
      access: policy.access,
      requiredPermissions: policy.requiredPermissions.join(","),
      allowApiKey: policy.allowApiKey,
      allowInternal: policy.allowInternal,
      priority: policy.priority,
      enabled: policy.enabled,
      description: policy.description,
    });
  }
}

export async function getUserPermissionSnapshot(userId: string): Promise<UserPermissionSnapshot> {
  const db = await createDb();
  const userRoleRecords = await db.query.userRoles.findMany({
    where: eq(userRoles.userId, userId),
    with: { role: true },
  });

  const roleNames = userRoleRecords
    .map((record) => record.role.name)
    .filter((roleName): roleName is Role => isKnownRole(roleName));

  if (roleNames.includes(ROLES.EMPEROR)) {
    return {
      roles: roleNames,
      permissionKeys: getAllPermissionKeys(),
      source: "database",
    };
  }

  try {
    const roleIds = userRoleRecords.map((record) => record.roleId);
    if (!roleIds.length) {
      return { roles: roleNames, permissionKeys: [], source: "database" };
    }

    const dynamicRows = await db.query.rolePermissions.findMany({
      where: inArray(rolePermissions.roleId, roleIds),
    });

    const dynamicByRoleId = new Map<string, string[]>();
    for (const row of dynamicRows) {
      const current = dynamicByRoleId.get(row.roleId) ?? [];
      current.push(row.permissionKey);
      dynamicByRoleId.set(row.roleId, current);
    }

    const permissionKeys: string[] = [];
    for (const record of userRoleRecords) {
      const dynamicKeys = dynamicByRoleId.get(record.roleId);
      if (dynamicKeys) {
        permissionKeys.push(...dynamicKeys);
        continue;
      }

      if (isKnownRole(record.role.name)) {
        permissionKeys.push(...getDefaultRolePermissions(record.role.name));
      }
    }

    return {
      roles: roleNames,
      permissionKeys: uniquePermissions(permissionKeys),
      source: "database",
    };
  } catch (error) {
    console.error("Falling back to static role permissions:", error);
    const fallback = getAllPermissionKeys().filter((permission) => hasPermission(roleNames, permission));
    return { roles: roleNames, permissionKeys: fallback, source: "fallback" };
  }
}

export async function userHasPermission(userId: string, permission: Permission) {
  const snapshot = await getUserPermissionSnapshot(userId);
  return snapshot.permissionKeys.includes(permission);
}

export async function userHasAnyPermission(userId: string, requiredPermissions: Permission[]) {
  if (!requiredPermissions.length) return true;
  const snapshot = await getUserPermissionSnapshot(userId);
  return requiredPermissions.some((permission) => snapshot.permissionKeys.includes(permission));
}

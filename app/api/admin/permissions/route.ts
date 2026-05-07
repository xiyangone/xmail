import { NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { auth, checkPermission } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { apiKeys, apiKeyScopes, permissions, rolePermissions, roles, routePolicies } from "@/lib/schema";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    const canView =
      (await checkPermission(PERMISSIONS.VIEW_PERMISSIONS)) ||
      (await checkPermission(PERMISSIONS.MANAGE_PERMISSIONS));

    if (!canView) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const db = await createDb();
    const [permissionRows, roleRows, rolePermissionRows, routePolicyRows, apiKeyRows, apiKeyScopeRows] =
      await Promise.all([
        db.select().from(permissions).orderBy(asc(permissions.key)),
        db.select().from(roles).orderBy(asc(roles.name)),
        db.select().from(rolePermissions),
        db.select().from(routePolicies).orderBy(asc(routePolicies.priority), asc(routePolicies.pathPattern)),
        db
          .select({ id: apiKeys.id, name: apiKeys.name, userId: apiKeys.userId, enabled: apiKeys.enabled })
          .from(apiKeys)
          .where(eq(apiKeys.enabled, true))
          .orderBy(asc(apiKeys.name)),
        db.select().from(apiKeyScopes),
      ]);

    return NextResponse.json({
      permissions: permissionRows,
      roles: roleRows,
      rolePermissions: rolePermissionRows,
      routePolicies: routePolicyRows,
      apiKeys: apiKeyRows,
      apiKeyScopes: apiKeyScopeRows,
      canManage: await checkPermission(PERMISSIONS.MANAGE_PERMISSIONS),
    });
  } catch (error) {
    console.error("获取权限管理数据失败:", error);
    return NextResponse.json({ error: "获取权限管理数据失败" }, { status: 500 });
  }
}

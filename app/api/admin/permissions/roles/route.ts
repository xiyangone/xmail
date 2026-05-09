import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { auth, checkPermission } from "@/lib/auth";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
import { permissions, rolePermissions, roles } from "@/lib/schema";
import { PERMISSIONS } from "@/lib/permissions";

type RolePermissionUpdate = {
  roleId?: string;
  permissionKeys?: string[];
};

async function requirePermissionAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "未授权" }, { status: 401 }) };
  }

  const hasPermission = await checkPermission(PERMISSIONS.MANAGE_PERMISSIONS);
  if (!hasPermission) {
    return { error: NextResponse.json({ error: "权限不足" }, { status: 403 }) };
  }

  return { session };
}

export async function GET() {
  try {
    const access = await requirePermissionAdmin();
    if (access.error) return access.error;

    const db = await createDb();
    const roleRows = await db.query.roles.findMany();
    const permissionRows = await db.query.rolePermissions.findMany();
    const permissionsByRoleId = new Map<string, string[]>();

    for (const permission of permissionRows) {
      const current = permissionsByRoleId.get(permission.roleId) ?? [];
      current.push(permission.permissionKey);
      permissionsByRoleId.set(permission.roleId, current);
    }

    return NextResponse.json({
      roles: roleRows.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        permissionKeys: permissionsByRoleId.get(role.id) ?? [],
      })),
    });
  } catch (error) {
    console.error("获取角色权限失败:", error);
    return NextResponse.json({ error: "获取角色权限失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requirePermissionAdmin();
    if (access.error) return access.error;

    const { roleId, permissionKeys = [] } = (await request.json()) as RolePermissionUpdate;
    if (!roleId) {
      return NextResponse.json({ error: "缺少角色 ID" }, { status: 400 });
    }

    const db = await createDb();
    const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
    if (!role) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    const uniquePermissionKeys = Array.from(new Set(permissionKeys));
    if (uniquePermissionKeys.length > 0) {
      const validPermissions = await db.query.permissions.findMany({
        where: inArray(permissions.key, uniquePermissionKeys),
      });
      if (validPermissions.length !== uniquePermissionKeys.length) {
        return NextResponse.json({ error: "包含无效权限" }, { status: 400 });
      }
    }

    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    if (uniquePermissionKeys.length > 0) {
      await db.insert(rolePermissions).values(
        uniquePermissionKeys.map((permissionKey) => ({
          roleId,
          permissionKey,
        }))
      );
    }

    const actorUserId = access.session.user.id;
    if (!actorUserId) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    await recordAdminMutationAudit({
      request,
      actorUserId,
      action: "permissions.role.update",
      targetType: "role",
      targetId: roleId,
      summary: `更新角色 ${role.name} 的权限`,
      metadata: { permissionKeys: uniquePermissionKeys },
      db,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新角色权限失败:", error);
    return NextResponse.json({ error: "更新角色权限失败" }, { status: 500 });
  }
}

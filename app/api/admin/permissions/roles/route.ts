import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth, checkPermission } from "@/lib/auth";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
import { permissions, rolePermissions, roles, userRoles } from "@/lib/schema";
import { PERMISSIONS, ROLES } from "@/lib/permissions";

const updateRolePermissionsSchema = z.object({
  roleId: z.string().min(1),
  permissionKeys: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    if (!(await checkPermission(PERMISSIONS.MANAGE_PERMISSIONS))) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const validation = updateRolePermissionsSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { roleId, permissionKeys } = validation.data;
    const db = await createDb();
    const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
    if (!role) {
      return NextResponse.json({ error: "角色不存在" }, { status: 404 });
    }

    if (role.name === ROLES.EMPEROR) {
      return NextResponse.json({ error: "emperor 角色保留全部权限，不能被动态授权覆盖" }, { status: 400 });
    }

    const uniquePermissionKeys = Array.from(new Set(permissionKeys));
    if (uniquePermissionKeys.length > 0) {
      const knownPermissions = await db
        .select({ key: permissions.key })
        .from(permissions)
        .where(inArray(permissions.key, uniquePermissionKeys));
      const knownKeys = new Set(knownPermissions.map((permission) => permission.key));
      const unknownKey = uniquePermissionKeys.find((key) => !knownKeys.has(key));
      if (unknownKey) {
        return NextResponse.json({ error: `未知权限：${unknownKey}` }, { status: 400 });
      }
    }

    if (!uniquePermissionKeys.includes(PERMISSIONS.MANAGE_PERMISSIONS)) {
      const currentUserHasRole = await db.query.userRoles.findFirst({
        where: and(eq(userRoles.userId, session.user.id), eq(userRoles.roleId, roleId)),
      });
      if (currentUserHasRole) {
        return NextResponse.json({ error: "不能移除当前用户自己的权限管理能力" }, { status: 400 });
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

    await recordAdminMutationAudit({
      request,
      actorUserId: session.user.id,
      action: "permissions.role.update",
      targetType: "role",
      targetId: roleId,
      summary: `更新角色 ${role.name} 的权限`,
      metadata: {
        roleName: role.name,
        permissionKeys: uniquePermissionKeys,
      },
      db,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新角色权限失败:", error);
    return NextResponse.json({ error: "更新角色权限失败" }, { status: 500 });
  }
}

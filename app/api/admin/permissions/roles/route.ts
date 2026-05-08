import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
import { jsonError, parseJsonBody, requireAdminPermission } from "@/lib/admin-api";
import { permissions, rolePermissions, roles, userRoles } from "@/lib/schema";
import { PERMISSIONS, ROLES } from "@/lib/permissions";

const updateRolePermissionsSchema = z.object({
  roleId: z.string().min(1),
  permissionKeys: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireAdminPermission(PERMISSIONS.MANAGE_PERMISSIONS);
    if (!guard.ok) return guard.response;

    const parsed = await parseJsonBody(request, updateRolePermissionsSchema);
    if (!parsed.ok) return parsed.response;

    const { roleId, permissionKeys } = parsed.data;
    const db = await createDb();
    const role = await db.query.roles.findFirst({ where: eq(roles.id, roleId) });
    if (!role) {
      return jsonError("角色不存在", 404);
    }

    if (role.name === ROLES.EMPEROR) {
      return jsonError("emperor 角色保留全部权限，不能被动态授权覆盖", 400);
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
        return jsonError(`未知权限：${unknownKey}`, 400);
      }
    }

    if (!uniquePermissionKeys.includes(PERMISSIONS.MANAGE_PERMISSIONS)) {
      const currentUserHasRole = await db.query.userRoles.findFirst({
        where: and(eq(userRoles.userId, guard.userId), eq(userRoles.roleId, roleId)),
      });
      if (currentUserHasRole) {
        return jsonError("不能移除当前用户自己的权限管理能力", 400);
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
      actorUserId: guard.userId,
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
    return jsonError("更新角色权限失败", 500);
  }
}

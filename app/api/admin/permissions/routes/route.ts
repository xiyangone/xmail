import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
import { jsonError, parseJsonBody, requireAdminPermission } from "@/lib/admin-api";
import { permissions, routePolicies } from "@/lib/schema";
import { PERMISSIONS } from "@/lib/permissions";

const routePolicySchema = z.object({
  id: z.string().min(1),
  methods: z.string().min(1),
  access: z.enum(["public", "authenticated", "permission", "internal"]),
  requiredPermissions: z.array(z.string().min(1)),
  allowApiKey: z.boolean(),
  allowInternal: z.boolean(),
  priority: z.number().int(),
  enabled: z.boolean(),
  description: z.string().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireAdminPermission(PERMISSIONS.MANAGE_PERMISSIONS);
    if (!guard.ok) return guard.response;

    const parsed = await parseJsonBody(request, routePolicySchema);
    if (!parsed.ok) return parsed.response;

    const { id, requiredPermissions, ...payload } = parsed.data;
    const db = await createDb();
    const policy = await db.query.routePolicies.findFirst({ where: eq(routePolicies.id, id) });
    if (!policy) {
      return jsonError("路由策略不存在", 404);
    }

    const uniquePermissionKeys = Array.from(new Set(requiredPermissions));
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

    await db
      .update(routePolicies)
      .set({
        ...payload,
        requiredPermissions: uniquePermissionKeys.join(","),
        updatedAt: new Date(),
      })
      .where(eq(routePolicies.id, id));
    await recordAdminMutationAudit({
      request,
      actorUserId: guard.userId,
      action: "permissions.route_policy.update",
      targetType: "route_policy",
      targetId: id,
      summary: `更新路由策略 ${policy.pathPattern}`,
      metadata: {
        pathPattern: policy.pathPattern,
        methods: payload.methods,
        access: payload.access,
        requiredPermissions: uniquePermissionKeys,
        allowApiKey: payload.allowApiKey,
        allowInternal: payload.allowInternal,
        priority: payload.priority,
        enabled: payload.enabled,
      },
      db,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新路由策略失败:", error);
    return jsonError("更新路由策略失败", 500);
  }
}

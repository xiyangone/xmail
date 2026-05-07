import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth, checkPermission } from "@/lib/auth";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    if (!(await checkPermission(PERMISSIONS.MANAGE_PERMISSIONS))) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const validation = routePolicySchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { id, requiredPermissions, ...payload } = validation.data;
    const db = await createDb();
    const policy = await db.query.routePolicies.findFirst({ where: eq(routePolicies.id, id) });
    if (!policy) {
      return NextResponse.json({ error: "路由策略不存在" }, { status: 404 });
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
        return NextResponse.json({ error: `未知权限：${unknownKey}` }, { status: 400 });
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
      actorUserId: session.user.id,
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
    return NextResponse.json({ error: "更新路由策略失败" }, { status: 500 });
  }
}

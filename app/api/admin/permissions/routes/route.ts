import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
import { routePolicies } from "@/lib/schema";
import { requirePermissionAdmin } from "../permission-admin";

type RoutePolicyUpdate = {
  id?: string;
  pathPattern?: string;
  methods?: string;
  access?: string;
  requiredPermissions?: string[];
  allowApiKey?: boolean;
  allowInternal?: boolean;
  priority?: number;
  enabled?: boolean;
  description?: string | null;
};

export async function GET() {
  try {
    const access = await requirePermissionAdmin();
    if ("error" in access) return access.error;

    const db = await createDb();
    const policies = await db.query.routePolicies.findMany();

    return NextResponse.json({
      routePolicies: policies.map((policy) => ({
        ...policy,
        requiredPermissions: policy.requiredPermissions
          ? policy.requiredPermissions.split(",").filter(Boolean)
          : [],
      })),
    });
  } catch (error) {
    console.error("获取路由策略失败:", error);
    return NextResponse.json({ error: "获取路由策略失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requirePermissionAdmin();
    if ("error" in access) return access.error;

    const body = (await request.json()) as RoutePolicyUpdate;
    if (!body.id) {
      return NextResponse.json({ error: "缺少路由策略 ID" }, { status: 400 });
    }

    const db = await createDb();
    const existing = await db.query.routePolicies.findFirst({
      where: eq(routePolicies.id, body.id),
    });
    if (!existing) {
      return NextResponse.json({ error: "路由策略不存在" }, { status: 404 });
    }

    const requiredPermissions = body.requiredPermissions
      ? Array.from(new Set(body.requiredPermissions)).join(",")
      : existing.requiredPermissions;

    await db
      .update(routePolicies)
      .set({
        pathPattern: body.pathPattern ?? existing.pathPattern,
        methods: body.methods ?? existing.methods,
        access: body.access ?? existing.access,
        requiredPermissions,
        allowApiKey: body.allowApiKey ?? existing.allowApiKey,
        allowInternal: body.allowInternal ?? existing.allowInternal,
        priority: body.priority ?? existing.priority,
        enabled: body.enabled ?? existing.enabled,
        description: body.description ?? existing.description,
        updatedAt: new Date(),
      })
      .where(eq(routePolicies.id, body.id));

    await recordAdminMutationAudit({
      request,
      actorUserId: access.actorUserId,
      action: "permissions.route_policy.update",
      targetType: "route_policy",
      targetId: body.id,
      summary: `更新路由策略 ${existing.pathPattern}`,
      metadata: body,
      db,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新路由策略失败:", error);
    return NextResponse.json({ error: "更新路由策略失败" }, { status: 500 });
  }
}

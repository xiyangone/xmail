import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { auth, checkPermission } from "@/lib/auth";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
import { apiKeys, apiKeyScopes, permissions } from "@/lib/schema";
import { PERMISSIONS } from "@/lib/permissions";

type ApiKeyScopeUpdate = {
  apiKeyId?: string;
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
    const scopeRows = await db.query.apiKeyScopes.findMany();

    return NextResponse.json({ scopes: scopeRows });
  } catch (error) {
    console.error("获取 API Key 权限范围失败:", error);
    return NextResponse.json({ error: "获取 API Key 权限范围失败" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const access = await requirePermissionAdmin();
    if (access.error) return access.error;

    const { apiKeyId, permissionKeys = [] } = (await request.json()) as ApiKeyScopeUpdate;
    if (!apiKeyId) {
      return NextResponse.json({ error: "缺少 API Key ID" }, { status: 400 });
    }

    const db = await createDb();
    const apiKey = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, apiKeyId) });
    if (!apiKey) {
      return NextResponse.json({ error: "API Key 不存在" }, { status: 404 });
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

    await db.delete(apiKeyScopes).where(eq(apiKeyScopes.apiKeyId, apiKeyId));
    if (uniquePermissionKeys.length > 0) {
      await db.insert(apiKeyScopes).values(
        uniquePermissionKeys.map((permissionKey) => ({
          apiKeyId,
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
      action: "permissions.api_key_scope.update",
      targetType: "api_key",
      targetId: apiKeyId,
      summary: `更新 API Key ${apiKey.name} 的权限范围`,
      metadata: { permissionKeys: uniquePermissionKeys },
      db,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新 API Key 权限范围失败:", error);
    return NextResponse.json({ error: "更新 API Key 权限范围失败" }, { status: 500 });
  }
}

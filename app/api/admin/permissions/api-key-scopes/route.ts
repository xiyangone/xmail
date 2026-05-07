import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth, checkPermission } from "@/lib/auth";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
import { apiKeyScopes, apiKeys, permissions } from "@/lib/schema";
import { PERMISSIONS } from "@/lib/permissions";

const updateApiKeyScopesSchema = z.object({
  apiKeyId: z.string().min(1),
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

    const validation = updateApiKeyScopesSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json({ error: validation.error.errors[0].message }, { status: 400 });
    }

    const { apiKeyId, permissionKeys } = validation.data;
    const db = await createDb();
    const apiKey = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, apiKeyId) });
    if (!apiKey) {
      return NextResponse.json({ error: "API Key 不存在" }, { status: 404 });
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

    await db.delete(apiKeyScopes).where(eq(apiKeyScopes.apiKeyId, apiKeyId));

    if (uniquePermissionKeys.length > 0) {
      await db.insert(apiKeyScopes).values(
        uniquePermissionKeys.map((permissionKey) => ({
          apiKeyId,
          permissionKey,
        }))
      );
    }

    await recordAdminMutationAudit({
      request,
      actorUserId: session.user.id,
      action: "permissions.api_key_scope.update",
      targetType: "api_key",
      targetId: apiKeyId,
      summary: "更新 API Key 权限范围",
      metadata: {
        name: apiKey.name,
        permissionKeys: uniquePermissionKeys,
      },
      db,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新 API Key Scope 失败:", error);
    return NextResponse.json({ error: "更新 API Key Scope 失败" }, { status: 500 });
  }
}

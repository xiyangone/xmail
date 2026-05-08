import { NextRequest, NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { recordAdminMutationAudit } from "@/lib/admin-audit";
import { createDb } from "@/lib/db";
import { jsonError, parseJsonBody, requireAdminPermission } from "@/lib/admin-api";
import { apiKeyScopes, apiKeys, permissions } from "@/lib/schema";
import { PERMISSIONS } from "@/lib/permissions";

const updateApiKeyScopesSchema = z.object({
  apiKeyId: z.string().min(1),
  permissionKeys: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
  try {
    const guard = await requireAdminPermission(PERMISSIONS.MANAGE_PERMISSIONS);
    if (!guard.ok) return guard.response;

    const parsed = await parseJsonBody(request, updateApiKeyScopesSchema);
    if (!parsed.ok) return parsed.response;

    const { apiKeyId, permissionKeys } = parsed.data;
    const db = await createDb();
    const apiKey = await db.query.apiKeys.findFirst({ where: eq(apiKeys.id, apiKeyId) });
    if (!apiKey) {
      return jsonError("API Key 不存在", 404);
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
      actorUserId: guard.userId,
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
    return jsonError("更新 API Key Scope 失败", 500);
  }
}

import { NextResponse } from "next/server";
import type { z } from "zod";
import { auth, checkPermission } from "./auth";
import type { Permission } from "./permissions";

export function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export async function requireAdminPermission(permission: Permission) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, response: jsonError("未授权", 401) };
  }

  if (!(await checkPermission(permission))) {
    return { ok: false as const, response: jsonError("权限不足", 403) };
  }

  return { ok: true as const, userId: session.user.id };
}

export async function parseJsonBody<TSchema extends z.ZodTypeAny>(
  request: Request,
  schema: TSchema
): Promise<{ ok: true; data: z.infer<TSchema> } | { ok: false; response: Response }> {
  try {
    const validation = schema.safeParse(await request.json());
    if (!validation.success) {
      return { ok: false, response: jsonError(validation.error.issues[0]?.message ?? "请求参数无效", 400) };
    }

    return { ok: true, data: validation.data };
  } catch {
    return { ok: false, response: jsonError("请求 JSON 无效", 400) };
  }
}

export function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function clampPageSize(value: string | null, fallback: number, max: number) {
  return Math.min(parsePositiveInt(value, fallback), max);
}

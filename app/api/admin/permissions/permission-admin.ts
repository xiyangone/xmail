import { NextResponse } from "next/server";
import { auth, checkPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";

type PermissionAdminAccess =
  | { error: NextResponse; actorUserId?: never }
  | { error?: never; actorUserId: string };

export async function requirePermissionAdmin(): Promise<PermissionAdminAccess> {
  const session = await auth();
  const actorUserId = session?.user?.id;

  if (!actorUserId) {
    return { error: NextResponse.json({ error: "未授权" }, { status: 401 }) };
  }

  const hasPermission = await checkPermission(PERMISSIONS.MANAGE_PERMISSIONS);
  if (!hasPermission) {
    return { error: NextResponse.json({ error: "权限不足" }, { status: 403 }) };
  }

  return { actorUserId };
}

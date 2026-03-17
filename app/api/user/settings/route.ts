import { getUserId } from "@/lib/apiKey";
import { checkPermission } from "@/lib/auth";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { userSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

// 读取当前用户的背景设置
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const db = await createDb();
  const settings = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  return Response.json({
    bgLight: settings?.bgLight || "",
    bgDark: settings?.bgDark || "",
    bgSakura: settings?.bgSakura || "",
    bgEnabled: settings?.bgEnabled ?? true,
  });
}

// 更新当前用户的背景设置（KNIGHT 及以上）
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  // MANAGE_WEBHOOK 权限 = KNIGHT / DUKE / EMPEROR
  const canCustomize = await checkPermission(PERMISSIONS.MANAGE_WEBHOOK);
  if (!canCustomize) {
    return Response.json({ error: "权限不足，骑士及以上可自定义背景" }, { status: 403 });
  }

  const { bgLight, bgDark, bgSakura, bgEnabled } = (await request.json()) as {
    bgLight?: string;
    bgDark?: string;
    bgSakura?: string;
    bgEnabled?: boolean;
  };

  const db = await createDb();
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  if (existing) {
    await db
      .update(userSettings)
      .set({
        ...(bgLight !== undefined && { bgLight }),
        ...(bgDark !== undefined && { bgDark }),
        ...(bgSakura !== undefined && { bgSakura }),
        ...(bgEnabled !== undefined && { bgEnabled }),
        updatedAt: new Date(),
      })
      .where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({
      userId,
      bgLight: bgLight || null,
      bgDark: bgDark || null,
      bgSakura: bgSakura || null,
      bgEnabled: bgEnabled ?? true,
      updatedAt: new Date(),
    });
  }

  return Response.json({ success: true });
}

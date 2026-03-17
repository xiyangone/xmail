import { eq } from "drizzle-orm";
import { getUserId } from "@/lib/apiKey";
import { checkPermission } from "@/lib/auth";
import { defaultBackgroundSettings, type BackgroundSettingsConfig } from "@/lib/background-config";
import { createDb } from "@/lib/db";
import { PERMISSIONS } from "@/lib/permissions";
import { userSettings } from "@/lib/schema";

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
    ...defaultBackgroundSettings,
    bgLight: settings?.bgLight || "",
    bgDark: settings?.bgDark || "",
    bgSakura: settings?.bgSakura || "",
    bgAmber: settings?.bgAmber || "",
    bgEnabled: settings?.bgEnabled ?? true,
    bgLightEnabled: settings?.bgLightEnabled ?? true,
    bgDarkEnabled: settings?.bgDarkEnabled ?? true,
    bgSakuraEnabled: settings?.bgSakuraEnabled ?? true,
    bgAmberEnabled: settings?.bgAmberEnabled ?? true,
  } satisfies BackgroundSettingsConfig);
}

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return Response.json({ error: "未登录" }, { status: 401 });
  }

  const canCustomize = await checkPermission(PERMISSIONS.MANAGE_WEBHOOK);
  if (!canCustomize) {
    return Response.json({ error: "权限不足，骑士及以上可自定义背景" }, { status: 403 });
  }

  const payload = (await request.json()) as Partial<BackgroundSettingsConfig>;

  const db = await createDb();
  const existing = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });

  const nextValues = {
    ...(payload.bgLight !== undefined && { bgLight: payload.bgLight }),
    ...(payload.bgDark !== undefined && { bgDark: payload.bgDark }),
    ...(payload.bgSakura !== undefined && { bgSakura: payload.bgSakura }),
    ...(payload.bgAmber !== undefined && { bgAmber: payload.bgAmber }),
    ...(payload.bgEnabled !== undefined && { bgEnabled: payload.bgEnabled }),
    ...(payload.bgLightEnabled !== undefined && { bgLightEnabled: payload.bgLightEnabled }),
    ...(payload.bgDarkEnabled !== undefined && { bgDarkEnabled: payload.bgDarkEnabled }),
    ...(payload.bgSakuraEnabled !== undefined && { bgSakuraEnabled: payload.bgSakuraEnabled }),
    ...(payload.bgAmberEnabled !== undefined && { bgAmberEnabled: payload.bgAmberEnabled }),
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(userSettings).set(nextValues).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({
      userId,
      bgLight: payload.bgLight || null,
      bgDark: payload.bgDark || null,
      bgSakura: payload.bgSakura || null,
      bgAmber: payload.bgAmber || null,
      bgEnabled: payload.bgEnabled ?? true,
      bgLightEnabled: payload.bgLightEnabled ?? true,
      bgDarkEnabled: payload.bgDarkEnabled ?? true,
      bgSakuraEnabled: payload.bgSakuraEnabled ?? true,
      bgAmberEnabled: payload.bgAmberEnabled ?? true,
      updatedAt: new Date(),
    });
  }

  return Response.json({ success: true });
}

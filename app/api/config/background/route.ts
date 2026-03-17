import { getCloudflareContext } from "@opennextjs/cloudflare";
import { checkPermission } from "@/lib/auth";
import { defaultBackgroundSettings, type BackgroundSettingsConfig } from "@/lib/background-config";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET() {
  const { env } = await getCloudflareContext();
  const [
    bgEnabled,
    bgLight,
    bgDark,
    bgSakura,
    bgAmber,
    bgLightEnabled,
    bgDarkEnabled,
    bgSakuraEnabled,
    bgAmberEnabled,
  ] = await Promise.all([
    env.SITE_CONFIG.get("BG_ENABLED"),
    env.SITE_CONFIG.get("BG_LIGHT"),
    env.SITE_CONFIG.get("BG_DARK"),
    env.SITE_CONFIG.get("BG_SAKURA"),
    env.SITE_CONFIG.get("BG_AMBER"),
    env.SITE_CONFIG.get("BG_LIGHT_ENABLED"),
    env.SITE_CONFIG.get("BG_DARK_ENABLED"),
    env.SITE_CONFIG.get("BG_SAKURA_ENABLED"),
    env.SITE_CONFIG.get("BG_AMBER_ENABLED"),
  ]);

  return Response.json(
    {
      ...defaultBackgroundSettings,
      bgEnabled: bgEnabled !== "false",
      bgLight: bgLight || "",
      bgDark: bgDark || "",
      bgSakura: bgSakura || "",
      bgAmber: bgAmber || "",
      bgLightEnabled: bgLightEnabled !== "false",
      bgDarkEnabled: bgDarkEnabled !== "false",
      bgSakuraEnabled: bgSakuraEnabled !== "false",
      bgAmberEnabled: bgAmberEnabled !== "false",
    } satisfies BackgroundSettingsConfig,
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}

export async function POST(request: Request) {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG);
  if (!canAccess) {
    return Response.json({ error: "权限不足" }, { status: 403 });
  }

  const payload = (await request.json()) as Partial<BackgroundSettingsConfig>;
  const { env } = await getCloudflareContext();
  const promises: Promise<void>[] = [];

  if (payload.bgEnabled !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_ENABLED", String(payload.bgEnabled)));
  }
  if (payload.bgLight !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_LIGHT", payload.bgLight));
  }
  if (payload.bgDark !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_DARK", payload.bgDark));
  }
  if (payload.bgSakura !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_SAKURA", payload.bgSakura));
  }
  if (payload.bgAmber !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_AMBER", payload.bgAmber));
  }
  if (payload.bgLightEnabled !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_LIGHT_ENABLED", String(payload.bgLightEnabled)));
  }
  if (payload.bgDarkEnabled !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_DARK_ENABLED", String(payload.bgDarkEnabled)));
  }
  if (payload.bgSakuraEnabled !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_SAKURA_ENABLED", String(payload.bgSakuraEnabled)));
  }
  if (payload.bgAmberEnabled !== undefined) {
    promises.push(env.SITE_CONFIG.put("BG_AMBER_ENABLED", String(payload.bgAmberEnabled)));
  }

  await Promise.all(promises);

  return Response.json({ success: true });
}

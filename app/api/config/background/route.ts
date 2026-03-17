import { checkPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// 读取全局背景配置（公开）
export async function GET() {
  const { env } = await getCloudflareContext();
  const [bgLight, bgDark, bgSakura] = await Promise.all([
    env.SITE_CONFIG.get("BG_LIGHT"),
    env.SITE_CONFIG.get("BG_DARK"),
    env.SITE_CONFIG.get("BG_SAKURA"),
  ]);

  return Response.json({
    bgLight: bgLight || "",
    bgDark: bgDark || "",
    bgSakura: bgSakura || "",
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}

// 设置全局背景配置（仅 EMPEROR）
export async function POST(request: Request) {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG);
  if (!canAccess) {
    return Response.json({ error: "权限不足" }, { status: 403 });
  }

  const { bgLight, bgDark, bgSakura } = (await request.json()) as {
    bgLight?: string;
    bgDark?: string;
    bgSakura?: string;
  };

  const { env } = await getCloudflareContext();
  const promises: Promise<void>[] = [];

  if (bgLight !== undefined) promises.push(env.SITE_CONFIG.put("BG_LIGHT", bgLight));
  if (bgDark !== undefined) promises.push(env.SITE_CONFIG.put("BG_DARK", bgDark));
  if (bgSakura !== undefined) promises.push(env.SITE_CONFIG.put("BG_SAKURA", bgSakura));

  await Promise.all(promises);

  return Response.json({ success: true });
}

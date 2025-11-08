import { NextResponse } from "next/server"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"

export const runtime = "edge"

interface CleanupConfig {
  deleteExpiredUsedCardKeys: boolean
  deleteExpiredUnusedCardKeys: boolean
  deleteExpiredEmails: boolean
  cardKeyDefaultDays: number
}

export async function GET() {
  const env = getRequestContext().env
  
  const [deleteExpiredUsedCardKeys, deleteExpiredUnusedCardKeys, deleteExpiredEmails, cardKeyDefaultDays] =
    await Promise.all([
      env.SITE_CONFIG.get("CLEANUP_DELETE_EXPIRED_USED_CARD_KEYS"),
      env.SITE_CONFIG.get("CLEANUP_DELETE_EXPIRED_UNUSED_CARD_KEYS"),
      env.SITE_CONFIG.get("CLEANUP_DELETE_EXPIRED_EMAILS"),
      env.SITE_CONFIG.get("CLEANUP_CARD_KEY_DEFAULT_DAYS"),
    ])

  return NextResponse.json({
    deleteExpiredUsedCardKeys: deleteExpiredUsedCardKeys === "false" ? false : true,
    deleteExpiredUnusedCardKeys: deleteExpiredUnusedCardKeys === "false" ? false : true,
    deleteExpiredEmails: deleteExpiredEmails === "false" ? false : true,
    cardKeyDefaultDays: parseInt(cardKeyDefaultDays || "7"),
  })
}

export async function POST(request: Request) {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG)

  if (!canAccess) {
    return NextResponse.json(
      { error: "权限不足" },
      { status: 403 }
    )
  }

  const config = (await request.json()) as CleanupConfig

  // 验证输入
  if (config.cardKeyDefaultDays < 1 || config.cardKeyDefaultDays > 365) {
    return NextResponse.json(
      { error: "卡密有效期必须在 1-365 天之间" },
      { status: 400 }
    )
  }

  const env = getRequestContext().env
  await Promise.all([
    env.SITE_CONFIG.put("CLEANUP_DELETE_EXPIRED_USED_CARD_KEYS", String(config.deleteExpiredUsedCardKeys)),
    env.SITE_CONFIG.put("CLEANUP_DELETE_EXPIRED_UNUSED_CARD_KEYS", String(config.deleteExpiredUnusedCardKeys)),
    env.SITE_CONFIG.put("CLEANUP_DELETE_EXPIRED_EMAILS", String(config.deleteExpiredEmails)),
    env.SITE_CONFIG.put("CLEANUP_CARD_KEY_DEFAULT_DAYS", String(config.cardKeyDefaultDays)),
  ])

  return NextResponse.json({ success: true })
}

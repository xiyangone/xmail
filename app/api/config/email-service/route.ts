import { NextResponse } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { checkPermission } from "@/lib/auth"
import { PERMISSIONS } from "@/lib/permissions"
import { EMAIL_CONFIG } from "@/config"

interface EmailServiceConfig {
  enabled: boolean
  apiKey: string
  roleLimits: {
    duke?: number
    knight?: number
  }
}

export async function GET() {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG)

  if (!canAccess) {
    return NextResponse.json({
      error: "权限不足"
    }, { status: 403 })
  }

  try {
    const { env } = await getCloudflareContext()
    const [enabled, apiKey, roleLimits] = await Promise.all([
      env.SITE_CONFIG.get("EMAIL_SERVICE_ENABLED"),
      env.SITE_CONFIG.get("RESEND_API_KEY"),
      env.SITE_CONFIG.get("EMAIL_ROLE_LIMITS")
    ])

    const customLimits = roleLimits ? JSON.parse(roleLimits) : {}

    const finalLimits = {
      duke: customLimits.duke !== undefined ? customLimits.duke : EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.duke,
      knight: customLimits.knight !== undefined ? customLimits.knight : EMAIL_CONFIG.DEFAULT_DAILY_SEND_LIMITS.knight,
    }

    return NextResponse.json({
      enabled: enabled === "true",
      apiKey: apiKey || "",
      roleLimits: finalLimits
    })
  } catch (error) {
    console.error("Failed to get email service config:", error)
    return NextResponse.json(
      { error: "获取 Resend 发件服务配置失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const canAccess = await checkPermission(PERMISSIONS.MANAGE_CONFIG)

  if (!canAccess) {
    return NextResponse.json({
      error: "权限不足"
    }, { status: 403 })
  }

  try {
    let rawConfig: unknown
    try {
      rawConfig = await request.json()
    } catch {
      return NextResponse.json(
        { error: "请求体不是有效的 JSON" },
        { status: 400 }
      )
    }

    if (!rawConfig || typeof rawConfig !== "object") {
      return NextResponse.json(
        { error: "请求体格式不正确" },
        { status: 400 }
      )
    }

    const config = rawConfig as Partial<EmailServiceConfig>
    if (typeof config.enabled !== "boolean" || typeof config.apiKey !== "string") {
      return NextResponse.json(
        { error: "缺少必要的配置字段" },
        { status: 400 }
      )
    }

    if (
      config.roleLimits !== undefined &&
      (typeof config.roleLimits !== "object" || config.roleLimits === null)
    ) {
      return NextResponse.json(
        { error: "角色限制配置格式不正确" },
        { status: 400 }
      )
    }

    if (
      (config.roleLimits?.duke !== undefined && !Number.isFinite(config.roleLimits.duke)) ||
      (config.roleLimits?.knight !== undefined && !Number.isFinite(config.roleLimits.knight))
    ) {
      return NextResponse.json(
        { error: "角色限制必须是数字" },
        { status: 400 }
      )
    }

    if (config.enabled && !config.apiKey.trim()) {
      return NextResponse.json(
        { error: "启用 Resend 时，API Key 为必填项" },
        { status: 400 }
      )
    }

    const { env } = await getCloudflareContext()

    const customLimits: { duke?: number; knight?: number } = {}
    if (config.roleLimits?.duke !== undefined) {
      customLimits.duke = config.roleLimits.duke
    }
    if (config.roleLimits?.knight !== undefined) {
      customLimits.knight = config.roleLimits.knight
    }

    await Promise.all([
      env.SITE_CONFIG.put("EMAIL_SERVICE_ENABLED", config.enabled.toString()),
      env.SITE_CONFIG.put("RESEND_API_KEY", config.apiKey.trim()),
      env.SITE_CONFIG.put("EMAIL_ROLE_LIMITS", JSON.stringify(customLimits))
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to save email service config:", error)
    return NextResponse.json(
      { error: "保存 Resend 发件服务配置失败" },
      { status: 500 }
    )
  }
}

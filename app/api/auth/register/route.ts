import { NextResponse } from "next/server"
import { register } from "@/lib/auth"
import { authSchema, AuthSchema } from "@/lib/validation"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { verifyTurnstileToken } from "@/lib/turnstile"


export async function POST(request: Request) {
  try {
    // 检查是否允许注册
    const { env } = await getCloudflareContext()
    const allowRegister = await env.SITE_CONFIG.get("ALLOW_REGISTER")

    if (allowRegister === "false") {
      return NextResponse.json(
        { error: "管理员已关闭新用户注册" },
        { status: 403 }
      )
    }

    const json = await request.json() as AuthSchema & { turnstileToken?: string }

    // 验证 Turnstile token
    const turnstileResult = await verifyTurnstileToken(
      json.turnstileToken,
      request.headers.get("CF-Connecting-IP")
    )
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error },
        { status: 400 }
      )
    }

    try {
      authSchema.parse(json)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "输入格式不正确" },
        { status: 400 }
      )
    }

    const { username, password } = json
    const user = await register(username, password)

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "注册失败" },
      { status: 500 }
    )
  }
} 
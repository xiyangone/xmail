import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createDb } from "@/lib/db"
import { emails, messages } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { checkSendPermission } from "@/lib/send-permissions"
import {
  normalizeEmailProvider,
  sendWithCloudflare,
  sendWithResend,
} from "@/lib/email-sender"

interface SendEmailRequest {
  to: string
  subject: string
  content: string
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "未授权" },
        { status: 401 }
      )
    }

    const { id } = await params
    const db = await createDb()

    const permissionResult = await checkSendPermission(session.user.id)
    if (!permissionResult.canSend) {
      return NextResponse.json(
        { error: permissionResult.error },
        { status: 403 }
      )
    }
    
    const remainingEmails = permissionResult.remainingEmails

    const { to, subject, content } = await request.json() as SendEmailRequest

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: "收件人、主题和内容都是必填项" },
        { status: 400 }
      )
    }

    const email = await db.query.emails.findFirst({
      where: eq(emails.id, id)
    })

    if (!email) {
      return NextResponse.json(
        { error: "邮箱不存在" },
        { status: 404 }
      )
    }

    if (email.userId !== session.user.id) {
      return NextResponse.json(
        { error: "无权访问此邮箱" },
        { status: 403 }
      )
    }

    const { env } = await getCloudflareContext()
    const [providerValue, resendApiKey, cloudflareAccountId, cloudflareApiToken] =
      await Promise.all([
        env.SITE_CONFIG.get("EMAIL_SEND_PROVIDER"),
        env.SITE_CONFIG.get("RESEND_API_KEY"),
        env.SITE_CONFIG.get("CLOUDFLARE_ACCOUNT_ID"),
        env.SITE_CONFIG.get("CLOUDFLARE_EMAIL_API_TOKEN"),
      ])
    const provider = normalizeEmailProvider(providerValue)

    if (provider === "resend" && !resendApiKey) {
      return NextResponse.json(
        { error: "Resend 发件服务未配置，请联系管理员" },
        { status: 500 }
      )
    }

    if (
      provider === "cloudflare" &&
      (!cloudflareAccountId || !cloudflareApiToken)
    ) {
      return NextResponse.json(
        { error: "Cloudflare 发件服务未配置，请联系管理员" },
        { status: 500 }
      )
    }

    // 先创建 pending 状态的消息记录
    const [pendingMessage] = await db.insert(messages).values({
      emailId: email.id,
      fromAddress: email.address,
      toAddress: to,
      subject,
      content: '',
      type: "pending",
      html: content
    }).returning()

    try {
      const sendInput = {
        to,
        subject,
        html: content,
        fromEmail: email.address,
      }
      if (provider === "cloudflare") {
        await sendWithCloudflare(sendInput, {
          accountId: cloudflareAccountId!,
          apiToken: cloudflareApiToken!,
        })
      } else {
        await sendWithResend(sendInput, { apiKey: resendApiKey! })
      }

      // 发送成功后更新状态为 sent
      await db.update(messages)
        .set({ type: "sent" })
        .where(eq(messages.id, pendingMessage.id))

      return NextResponse.json({
        success: true,
        message: "邮件发送成功",
        remainingEmails
      })
    } catch (sendError) {
      // 发送失败，更新状态为 failed
      await db.update(messages)
        .set({ type: "failed" })
        .where(eq(messages.id, pendingMessage.id))

      console.error('Failed to send email:', sendError)
      return NextResponse.json(
        { error: sendError instanceof Error ? sendError.message : "发送邮件失败" },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Failed to send email:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "发送邮件失败" },
      { status: 500 }
    )
  }
} 

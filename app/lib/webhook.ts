import { WEBHOOK_CONFIG } from "@/config"
import { createDb } from "./db"
import { webhookLogs } from "./schema"

export interface EmailMessage {
  emailId: string
  messageId: string
  fromAddress: string
  subject: string
  content: string
  html: string
  receivedAt: string
  toAddress: string
}

export interface WebhookPayload {
  event: typeof WEBHOOK_CONFIG.EVENTS[keyof typeof WEBHOOK_CONFIG.EVENTS]
  data: EmailMessage
}

export async function callWebhook(
  url: string,
  payload: WebhookPayload,
  webhookId?: string
): Promise<boolean> {
  let lastError: Error | null = null
  let attempts = 0

  for (let i = 0; i < WEBHOOK_CONFIG.MAX_RETRIES; i++) {
    attempts++
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), WEBHOOK_CONFIG.TIMEOUT)

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Event": payload.event,
        },
        body: JSON.stringify(payload.data),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        return true
      }

      lastError = new Error(`HTTP error! status: ${response.status}`)
    } catch (error) {
      lastError = error as Error

      if (i < WEBHOOK_CONFIG.MAX_RETRIES - 1) {
        await new Promise(resolve => setTimeout(resolve, WEBHOOK_CONFIG.RETRY_DELAY))
      }
    }
  }

  // 所有重试都失败后，记录失败日志
  try {
    const db = createDb()
    await db.insert(webhookLogs).values({
      webhookId: webhookId || null,
      url,
      event: payload.event,
      payload: JSON.stringify(payload.data),
      status: "failed",
      errorMessage: lastError?.message || "Unknown error",
      attempts,
    })
  } catch (logError) {
    console.error("Failed to log webhook failure:", logError)
  }

  // 记录错误但不中断主流程
  console.error(`Webhook call failed after ${attempts} attempts:`, {
    url,
    event: payload.event,
    error: lastError?.message
  })

  return false // 返回 false 而非抛出异常
} 
import { Env } from '../types'
import { drizzle } from 'drizzle-orm/d1'
import { messages, emails, webhooks, emailReceiverLogs } from '../app/lib/schema'
import { eq, sql } from 'drizzle-orm'
import PostalMime from 'postal-mime'
import type { Address, Mailbox } from 'postal-mime'
import { WEBHOOK_CONFIG } from '../app/config/webhook'
import { EmailMessage } from '../app/lib/webhook'
import { formatMailboxDisplay } from '../app/lib/contact-address'

function truncateLogValue(value: string | null | undefined, maxLength = 512) {
  if (!value) return null
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 3)}...`
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

function isMailbox(address: Address): address is Mailbox {
  return !('group' in address) || !address.group
}

function getVisibleSender(
  parsedAddress: Address | undefined,
  fallback: string
): string {
  if (parsedAddress && isMailbox(parsedAddress)) {
    const formatted = formatMailboxDisplay(parsedAddress, fallback)
    if (formatted) {
      return formatted
    }
  }

  return fallback
}

const handleEmail = async (message: ForwardableEmailMessage, env: Env) => {
  const db = drizzle(env.DB, { schema: { messages, emails, webhooks, emailReceiverLogs } })

  const parsedMessage = await PostalMime.parse(message.raw)

  console.log("parsedMessage:", parsedMessage)
  let webhookStatus: string | null = null

  try {
    const targetEmail = await db.query.emails.findFirst({
      where: eq(sql`LOWER(${emails.address})`, message.to.toLowerCase())
    })

    if (!targetEmail) {
      console.error(`Email not found: ${message.to}`)
      await db.insert(emailReceiverLogs).values({
        status: 'mailbox_not_found',
        recipient: message.to,
        sender: message.from,
        messageId: truncateLogValue(parsedMessage.messageId),
        subject: truncateLogValue(parsedMessage.subject),
        hasWebhook: false,
      })
      return
    }

    const sender = getVisibleSender(parsedMessage.from ?? parsedMessage.sender, message.from)
    const savedMessage = await db.insert(messages).values({
      emailId: targetEmail.id,
      fromAddress: sender,
      subject: parsedMessage.subject || '(无主题)',
      content: parsedMessage.text || '',
      html: parsedMessage.html || '',
      type: 'received',
    }).returning().get()

    const webhook = await db.query.webhooks.findFirst({
      where: eq(webhooks.userId, targetEmail!.userId!)
    })

    if (webhook?.enabled) {
      try {
        const webhookResponse = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Event': WEBHOOK_CONFIG.EVENTS.NEW_MESSAGE
          },
          body: JSON.stringify({
            emailId: targetEmail.id,
            messageId: savedMessage.id,
            fromAddress: savedMessage.fromAddress,
            subject: savedMessage.subject,
            content: savedMessage.content,
            html: savedMessage.html,
            receivedAt: savedMessage.receivedAt.toISOString(),
            toAddress: targetEmail.address
          } as EmailMessage)
        })
        webhookStatus = webhookResponse.ok ? 'success' : `failed:${webhookResponse.status}`
      } catch (error) {
        webhookStatus = 'failed'
        console.error('Failed to send webhook:', error)
      }
    } else {
      webhookStatus = 'not_configured'
    }

    await db.insert(emailReceiverLogs).values({
      status: 'stored',
      recipient: message.to,
      sender,
      messageId: truncateLogValue(parsedMessage.messageId),
      emailId: targetEmail.id,
      subject: truncateLogValue(parsedMessage.subject),
      hasWebhook: Boolean(webhook?.enabled),
      webhookStatus,
    })

    console.log(`Email processed: ${parsedMessage.subject}`)
  } catch (error) {
    console.error('Failed to process email:', error)
    await db.insert(emailReceiverLogs).values({
      status: 'failed',
      recipient: message.to,
      sender: message.from,
      messageId: truncateLogValue(parsedMessage.messageId),
      subject: truncateLogValue(parsedMessage.subject),
      hasWebhook: false,
      webhookStatus,
      errorMessage: truncateLogValue(toErrorMessage(error)),
    })
  }
}

const worker = {
  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    await handleEmail(message, env)
  }
}

export default worker

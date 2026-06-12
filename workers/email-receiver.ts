import { Env } from '../types'
import { DurableObject } from 'cloudflare:workers'
import { drizzle } from 'drizzle-orm/d1'
import { messages, emails, webhooks, emailReceiverLogs } from '../app/lib/schema'
import { eq, sql } from 'drizzle-orm'
import PostalMime from 'postal-mime'
import type { Address, Mailbox } from 'postal-mime'
import { WEBHOOK_CONFIG } from '../app/config/webhook'
import { EmailMessage } from '../app/lib/webhook'
import { formatMailboxDisplay } from '../app/lib/contact-address'
import { verifyRealtimeToken } from '../app/lib/realtime-token'

interface RealtimeMessageEvent {
  type: 'new_message'
  emailId: string
  messageId: string
  receivedAt: string
}

interface RealtimeSocketAttachment {
  emailId: string
  userId: string
  connectedAt: number
}

interface WebSocketResponseInit extends ResponseInit {
  webSocket: WebSocket
}

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

function getInternalWorkerSecret(env: Env) {
  return env.INTERNAL_WORKER_SECRET || ''
}

async function verifyRequestToken(request: Request, env: Env) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) {
    return { valid: false as const, response: new Response('Missing token', { status: 401 }) }
  }

  const result = await verifyRealtimeToken(token, getInternalWorkerSecret(env))
  if (!result.valid) {
    return { valid: false as const, response: new Response('Invalid token', { status: 401 }) }
  }

  return { valid: true as const, payload: result.payload }
}

async function notifyMailboxRealtime(
  env: Env,
  event: RealtimeMessageEvent
) {
  if (!env.MAILBOX_REALTIME) {
    return
  }

  try {
    const stub = env.MAILBOX_REALTIME.getByName(event.emailId)
    await stub.fetch(
      new Request('https://xmail.internal/realtime/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      })
    )
  } catch (error) {
    console.error('Failed to notify realtime subscribers:', error)
  }
}

async function handleRealtimeWebSocket(request: Request, env: Env) {
  if (request.headers.get('Upgrade') !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 426 })
  }

  const tokenResult = await verifyRequestToken(request, env)
  if (!tokenResult.valid) {
    return tokenResult.response
  }

  const stub = env.MAILBOX_REALTIME?.getByName(tokenResult.payload.emailId)
  if (!stub) {
    return new Response('Realtime binding is not configured', { status: 503 })
  }

  return stub.fetch(request)
}

export class MailboxRealtime extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/ws') {
      return this.handleWebSocket(request)
    }

    if (url.pathname === '/realtime/notify' && request.method === 'POST') {
      return this.handleNotify(request)
    }

    return new Response('Not Found', { status: 404 })
  }

  private async handleWebSocket(request: Request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const tokenResult = await verifyRequestToken(request, this.env)
    if (!tokenResult.valid) {
      return tokenResult.response
    }

    if (tokenResult.payload.emailId !== this.ctx.id.name) {
      return new Response('Token does not match mailbox', { status: 403 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    const attachment: RealtimeSocketAttachment = {
      emailId: tokenResult.payload.emailId,
      userId: tokenResult.payload.userId,
      connectedAt: Date.now(),
    }

    server.serializeAttachment(attachment)
    this.ctx.acceptWebSocket(server, [tokenResult.payload.emailId])
    server.send(JSON.stringify({ type: 'connected', emailId: tokenResult.payload.emailId }))

    return new Response(null, {
      status: 101,
      webSocket: client,
    } satisfies WebSocketResponseInit)
  }

  private async handleNotify(request: Request) {
    const event = (await request.json()) as RealtimeMessageEvent
    if (event.type !== 'new_message' || event.emailId !== this.ctx.id.name) {
      return new Response('Invalid realtime event', { status: 400 })
    }

    this.broadcast(event)
    return Response.json({ delivered: this.ctx.getWebSockets().length })
  }

  private broadcast(event: RealtimeMessageEvent) {
    const payload = JSON.stringify(event)
    for (const socket of this.ctx.getWebSockets(event.emailId)) {
      try {
        socket.send(payload)
      } catch (error) {
        console.error('Failed to send realtime message:', error)
        socket.close(1011, 'send failed')
      }
    }
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') {
      return
    }

    if (message === 'ping') {
      ws.send('pong')
    }
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('Realtime WebSocket error:', error)
    ws.close(1011, 'websocket error')
  }
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

    await notifyMailboxRealtime(env, {
      type: 'new_message',
      emailId: targetEmail.id,
      messageId: savedMessage.id,
      receivedAt: savedMessage.receivedAt.toISOString(),
    })

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
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname
    if (pathname === '/ws') {
      return handleRealtimeWebSocket(request, env)
    }

    return new Response('Not Found', { status: 404 })
  },

  async email(message: ForwardableEmailMessage, env: Env): Promise<void> {
    await handleEmail(message, env)
  }
}

export default worker

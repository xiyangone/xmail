import { createDb } from "./db"
import { apiKeys } from "./schema"
import { and, eq, gt, sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import type { User } from "next-auth"
import { auth } from "./auth"
import { headers } from "next/headers"
import { sha256Hash } from "@/lib/utils"

const CHINA_TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1000

function getChinaPeriodKeys(now: Date) {
  const shifted = new Date(now.getTime() + CHINA_TIMEZONE_OFFSET_MS)
  const iso = shifted.toISOString()
  return {
    day: iso.slice(0, 10),
    month: iso.slice(0, 7),
  }
}

async function incrementApiKeyUsage(apiKeyId: string) {
  const db = await createDb()
  const now = new Date()
  const { day, month } = getChinaPeriodKeys(now)

  await db
    .update(apiKeys)
    .set({
      totalCalls: sql`${apiKeys.totalCalls} + 1`,
      dailyCalls: sql`CASE WHEN ${apiKeys.dailyDate} = ${day} THEN ${apiKeys.dailyCalls} + 1 ELSE 1 END`,
      dailyDate: day,
      monthlyCalls: sql`CASE WHEN ${apiKeys.monthlyMonth} = ${month} THEN ${apiKeys.monthlyCalls} + 1 ELSE 1 END`,
      monthlyMonth: month,
      lastUsedAt: now,
    })
    .where(eq(apiKeys.id, apiKeyId))
}

async function getApiKeyByKey(
  key: string
): Promise<{ id: string; user: User } | null> {
  const keyHash = await sha256Hash(key)
  const db = await createDb()

  // 先尝试用哈希匹配（新格式）
  let apiKey = await db.query.apiKeys.findFirst({
    where: and(
      eq(apiKeys.key, keyHash),
      eq(apiKeys.enabled, true),
      gt(apiKeys.expiresAt, new Date())
    ),
    with: {
      user: true
    }
  })

  // 兼容旧格式（明文存储的 key）
  if (!apiKey) {
    apiKey = await db.query.apiKeys.findFirst({
      where: and(
        eq(apiKeys.key, key),
        eq(apiKeys.enabled, true),
        gt(apiKeys.expiresAt, new Date())
      ),
      with: {
        user: true
      }
    })

    // 旧格式匹配成功，自动迁移为哈希存储
    if (apiKey) {
      await db.update(apiKeys).set({ key: keyHash }).where(eq(apiKeys.id, apiKey.id))
    }
  }

  if (!apiKey) return null

  return { id: apiKey.id, user: apiKey.user }
}

export async function handleApiKeyAuth(
  apiKey: string,
  pathname: string,
  requestHeaders: Headers
) {
  if (!pathname.startsWith('/api/emails') && !pathname.startsWith('/api/config')) {
    return NextResponse.json(
      { error: "无权限查看" },
      { status: 403 }
    )
  }

  const record = await getApiKeyByKey(apiKey)
  if (!record?.user?.id) {
    return NextResponse.json(
      { error: "无效的 API Key" },
      { status: 401 }
    )
  }

  try {
    await incrementApiKeyUsage(record.id)
  } catch (error) {
    console.error("Failed to record API key usage:", error)
  }

  const nextHeaders = new Headers(requestHeaders)
  nextHeaders.delete("X-User-Id")
  nextHeaders.set("X-User-Id", record.user.id)

  const response = NextResponse.next({
    request: {
      headers: nextHeaders,
    },
  })

  // 便于调试（客户端也能看到）
  response.headers.set("X-User-Id", record.user.id)
  return response
}

export const getUserId = async () => {
  const headersList = await headers()
  const userId = headersList.get("X-User-Id")
  
  if (userId) return userId

  const session = await auth()

  return session?.user.id
}

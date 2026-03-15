import { createDb } from "./db"
import { apiKeys } from "./schema"
import { eq, and, gt } from "drizzle-orm"
import { NextResponse } from "next/server"
import type { User } from "next-auth"
import { auth } from "./auth"
import { headers } from "next/headers"
import { sha256Hash } from "@/lib/utils"

async function getUserByApiKey(key: string): Promise<User | null> {
  const keyHash = await sha256Hash(key)
  const db = createDb()

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

  return apiKey.user
}

export async function handleApiKeyAuth(apiKey: string, pathname: string) {
  if (!pathname.startsWith('/api/emails') && !pathname.startsWith('/api/config')) {
    return NextResponse.json(
      { error: "无权限查看" },
      { status: 403 }
    )
  }

  const user = await getUserByApiKey(apiKey)
  if (!user?.id) {
    return NextResponse.json(
      { error: "无效的 API Key" },
      { status: 401 }
    )
  }

  const response = NextResponse.next()
  response.headers.set("X-User-Id", user.id)
  return response
}

export const getUserId = async () => {
  const headersList = await headers()
  const userId = headersList.get("X-User-Id")
  
  if (userId) return userId

  const session = await auth()

  return session?.user.id
}

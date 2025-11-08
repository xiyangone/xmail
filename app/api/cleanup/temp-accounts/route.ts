import { NextResponse } from "next/server"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { createDb } from "@/lib/db"
import { cardKeys, tempAccounts, users, emails } from "@/lib/schema"
import { eq, and, lt } from "drizzle-orm"

export const runtime = "edge"

export async function POST() {
  try {
    const env = getRequestContext().env
    
    // 读取清理配置
    const [deleteExpiredUsedCardKeys, deleteExpiredUnusedCardKeys, deleteExpiredEmails] =
      await Promise.all([
        env.SITE_CONFIG.get("CLEANUP_DELETE_EXPIRED_USED_CARD_KEYS"),
        env.SITE_CONFIG.get("CLEANUP_DELETE_EXPIRED_UNUSED_CARD_KEYS"),
        env.SITE_CONFIG.get("CLEANUP_DELETE_EXPIRED_EMAILS"),
      ])

    const db = createDb()
    const now = new Date()
    let cleanedUsedCardKeys = 0
    let cleanedUnusedCardKeys = 0
    let cleanedEmails = 0

    // 1. 清理"已使用且过期"的卡密及关联的临时账号
    if (deleteExpiredUsedCardKeys !== "false") {
      // 查询所有活跃的临时账号
      const allActiveAccounts = await db.query.tempAccounts.findMany({
        where: eq(tempAccounts.isActive, true),
      })

      const expiredAccounts = []
      
      // 检查临时账号或对应的卡密是否过期
      for (const account of allActiveAccounts) {
        let isExpired = false
        
        // 检查临时账号是否过期
        if (account.expiresAt < now) {
          isExpired = true
        }
        
        // 检查对应的卡密是否过期
        if (account.cardKeyId) {
          const cardKey = await db.query.cardKeys.findFirst({
            where: eq(cardKeys.id, account.cardKeyId),
          })
          if (cardKey && cardKey.expiresAt < now) {
            isExpired = true
          }
        }
        
        if (isExpired) {
          expiredAccounts.push(account)
        }
      }

      for (const account of expiredAccounts) {
        // 删除用户及相关数据（级联删除会处理邮箱和消息）
        await db.delete(users).where(eq(users.id, account.userId))

        // 标记临时账号为非活跃
        await db
          .update(tempAccounts)
          .set({ isActive: false })
          .where(eq(tempAccounts.id, account.id))

        // 删除对应的卡密
        if (account.cardKeyId) {
          await db.delete(cardKeys).where(eq(cardKeys.id, account.cardKeyId))
        }
      }

      cleanedUsedCardKeys = expiredAccounts.length
    }

    // 2. 清理"过期未使用"的卡密
    if (deleteExpiredUnusedCardKeys !== "false") {
      const unusedCardKeys = await db.query.cardKeys.findMany({
        where: and(
          eq(cardKeys.isUsed, false),
          lt(cardKeys.expiresAt, now)
        ),
      })

      for (const cardKey of unusedCardKeys) {
        await db.delete(cardKeys).where(eq(cardKeys.id, cardKey.id))
      }

      cleanedUnusedCardKeys = unusedCardKeys.length
    }

    // 3. 清理"已过期邮箱"（含消息）
    if (deleteExpiredEmails !== "false") {
      const expiredEmails = await db.query.emails.findMany({
        where: lt(emails.expiresAt, now),
      })

      for (const email of expiredEmails) {
        await db.delete(emails).where(eq(emails.id, email.id))
      }

      cleanedEmails = expiredEmails.length
    }

    return NextResponse.json({
      success: true,
      message: `清理完成：${cleanedUsedCardKeys} 个已用卡密及临时账号，${cleanedUnusedCardKeys} 个未用卡密，${cleanedEmails} 个过期邮箱`,
      cleanedUsedCardKeys,
      cleanedUnusedCardKeys,
      cleanedEmails,
    })
  } catch (error) {
    console.error("清理失败:", error)
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : "清理失败" 
      },
      { status: 500 }
    )
  }
}

// 支持定时任务调用
export async function GET() {
  return POST()
}

import { NextResponse } from "next/server"
import { getRequestContext } from "@cloudflare/next-on-pages"
import { createDb } from "@/lib/db"
import { cardKeys, tempAccounts, users, emails } from "@/lib/schema"
import { eq, and, lt, inArray } from "drizzle-orm"

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
      // 使用关联查询一次获取临时账号及对应的卡密信息，避免 N+1
      const allActiveAccounts = await db.query.tempAccounts.findMany({
        where: eq(tempAccounts.isActive, true),
        with: {
          cardKey: true
        }
      })

      // 过滤出过期的账号
      const expiredAccounts = allActiveAccounts.filter(account => {
        // 检查临时账号是否过期
        if (account.expiresAt < now) return true
        // 检查对应的卡密是否过期
        if (account.cardKey && account.cardKey.expiresAt < now) return true
        return false
      })

      if (expiredAccounts.length > 0) {
        // 并行执行清理操作
        const cleanupPromises = expiredAccounts.map(async (account) => {
          try {
            // 并行执行删除和更新操作
            await Promise.all([
              // 删除用户及相关数据（级联删除会处理邮箱和消息）
              db.delete(users).where(eq(users.id, account.userId)),
              // 标记临时账号为非活跃
              db.update(tempAccounts)
                .set({ isActive: false })
                .where(eq(tempAccounts.id, account.id)),
              // 删除对应的卡密
              account.cardKeyId
                ? db.delete(cardKeys).where(eq(cardKeys.id, account.cardKeyId))
                : Promise.resolve()
            ])
            return true
          } catch (error) {
            console.error(`清理账号 ${account.id} 失败:`, error)
            return false
          }
        })

        const results = await Promise.all(cleanupPromises)
        cleanedUsedCardKeys = results.filter(Boolean).length
      }
    }

    // 2. 清理"过期未使用"的卡密 - 使用批量删除
    if (deleteExpiredUnusedCardKeys !== "false") {
      const unusedCardKeys = await db.query.cardKeys.findMany({
        where: and(
          eq(cardKeys.isUsed, false),
          lt(cardKeys.expiresAt, now)
        ),
      })

      if (unusedCardKeys.length > 0) {
        const cardKeyIds = unusedCardKeys.map(ck => ck.id)
        // 使用 inArray 批量删除
        await db.delete(cardKeys).where(inArray(cardKeys.id, cardKeyIds))
        cleanedUnusedCardKeys = unusedCardKeys.length
      }
    }

    // 3. 清理"已过期邮箱"（含消息）- 使用批量删除
    if (deleteExpiredEmails !== "false") {
      const expiredEmailsList = await db.query.emails.findMany({
        where: lt(emails.expiresAt, now),
      })

      if (expiredEmailsList.length > 0) {
        const emailIds = expiredEmailsList.map(e => e.id)
        // 使用 inArray 批量删除
        await db.delete(emails).where(inArray(emails.id, emailIds))
        cleanedEmails = expiredEmailsList.length
      }
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

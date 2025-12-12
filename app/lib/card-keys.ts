import { createDb } from "./db";
import { cardKeys, tempAccounts, users, emails, roles } from "./schema";
import { eq, and, lt, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ROLES } from "./permissions";
import { assignRoleToUser } from "./auth";

/**
 * 生成卡密代码
 */
export function generateCardKeyCode(): string {
  const prefix = "XYMAIL";
  const segments = Array.from({ length: 3 }, () => nanoid(4).toUpperCase());
  return `${prefix}-${segments.join("-")}`;
}

/**
 * 验证卡密是否有效
 */
export async function validateCardKey(code: string) {
  const db = createDb();

  const cardKey = await db.query.cardKeys.findFirst({
    where: eq(cardKeys.code, code),
  });

  if (!cardKey) {
    return { valid: false, error: "卡密不存在" };
  }

  if (cardKey.isUsed) {
    return { valid: false, error: "卡密已被使用" };
  }

  if (cardKey.expiresAt < new Date()) {
    return { valid: false, error: "卡密已过期" };
  }

  return { valid: true, cardKey };
}

/**
 * 使用卡密创建临时账号
 */
export async function activateCardKey(code: string) {
  const db = createDb();

  const validation = await validateCardKey(code);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const cardKey = validation.cardKey!;
  const now = new Date();
  const expiresAt = cardKey.expiresAt;

  // 检查是否已有关联的临时账号(支持重复登录)
  const existingTempAccount = await db.query.tempAccounts.findFirst({
    where: eq(tempAccounts.cardKeyId, cardKey.id),
  });

  let userId: string;

  if (existingTempAccount) {
    // 如果已有用户,直接使用现有用户
    userId = existingTempAccount.userId;

    // 更新临时账号的过期时间
    await db
      .update(tempAccounts)
      .set({
        expiresAt: expiresAt,
        isActive: true,
      })
      .where(eq(tempAccounts.id, existingTempAccount.id));

    // 更新邮箱的过期时间
    await db
      .update(emails)
      .set({ expiresAt: expiresAt })
      .where(eq(emails.userId, userId));
  } else {
    // 创建新的临时用户 - 使用补偿模式
    let createdUserId: string | null = null;
    let createdEmailIds: string[] = [];
    let createdTempAccountId: string | null = null;

    try {
      const userName =
        cardKey.mode === "single"
          ? `临时用户_${cardKey.emailAddress.split("@")[0]}`
          : `临时用户_${nanoid(6)}`;

      const userEmail =
        cardKey.mode === "single"
          ? cardKey.emailAddress
          : `temp_${nanoid(8)}@${cardKey.emailDomain || "temp.local"}`;

      const tempUser = await db
        .insert(users)
        .values({
          name: userName,
          email: userEmail,
          username: `temp_${nanoid(8)}`,
        })
        .returning();

      createdUserId = tempUser[0].id;
      userId = createdUserId;

      // 分配临时用户角色
      const tempRole = await db.query.roles.findFirst({
        where: eq(roles.name, ROLES.TEMP_USER),
      });

      if (!tempRole) {
        // 如果临时用户角色不存在，创建它
        const [newRole] = await db
          .insert(roles)
          .values({
            name: ROLES.TEMP_USER,
            description: "临时用户，只能访问绑定的邮箱",
          })
          .returning();

        await assignRoleToUser(db, userId, newRole.id);
      } else {
        await assignRoleToUser(db, userId, tempRole.id);
      }

      // 创建绑定的邮箱地址
      if (cardKey.mode === "single") {
        // 单卡密模式：创建一个固定邮箱
        const [createdEmail] = await db.insert(emails).values({
          address: cardKey.emailAddress,
          userId: userId,
          createdAt: now,
          expiresAt: expiresAt,
        }).returning();
        createdEmailIds.push(createdEmail.id);
      } else if (cardKey.mode === "multi") {
        // 多卡密模式：创建管理员指定的邮箱地址列表
        const emailAddresses = cardKey.emailAddress
          .split(",")
          .map((addr) => addr.trim())
          .filter((addr) => addr.length > 0); // 过滤空字符串

        if (emailAddresses.length === 0) {
          throw new Error("多卡密模式下没有有效的邮箱地址");
        }

        const emailsToCreate = emailAddresses.map((address) => ({
          address,
          userId: userId,
          createdAt: now,
          expiresAt: expiresAt,
        }));

        const createdEmails = await db.insert(emails).values(emailsToCreate).returning();
        createdEmailIds = createdEmails.map(e => e.id);
      }

      // 创建临时账号记录
      const [tempAccount] = await db.insert(tempAccounts).values({
        userId: userId,
        cardKeyId: cardKey.id,
        emailAddress:
          cardKey.mode === "single" ? cardKey.emailAddress : cardKey.emailDomain!,
        createdAt: now,
        expiresAt: expiresAt,
      }).returning();
      createdTempAccountId = tempAccount.id;

    } catch (error) {
      // 补偿逻辑：按创建顺序的逆序清理
      console.error("卡密激活失败，执行回滚:", error);

      try {
        // 回滚临时账号
        if (createdTempAccountId) {
          await db.delete(tempAccounts).where(eq(tempAccounts.id, createdTempAccountId));
        }

        // 回滚邮箱
        for (const emailId of createdEmailIds) {
          await db.delete(emails).where(eq(emails.id, emailId));
        }

        // 回滚用户（会级联删除 userRoles）
        if (createdUserId) {
          await db.delete(users).where(eq(users.id, createdUserId));
        }
      } catch (rollbackError) {
        console.error("回滚失败:", rollbackError);
        console.error("需要手动清理的数据:", { createdUserId, createdEmailIds, createdTempAccountId });
      }

      throw error;
    }
  }

  // 标记卡密为已使用
  await db
    .update(cardKeys)
    .set({
      isUsed: true,
      usedBy: userId,
      usedAt: now,
    })
    .where(eq(cardKeys.id, cardKey.id));

  return {
    userId,
    emailAddress:
      cardKey.mode === "single"
        ? cardKey.emailAddress
        : `${cardKey.emailLimit}个邮箱: ${cardKey.emailAddress}`,
    mode: cardKey.mode,
    emailDomain: cardKey.emailDomain,
    emailLimit: cardKey.emailLimit,
    expiresAt: expiresAt,
  };
}

/**
 * 检查用户是否为临时用户
 */
export async function isTempUser(userId: string): Promise<boolean> {
  const db = createDb();

  const tempAccount = await db.query.tempAccounts.findFirst({
    where: and(
      eq(tempAccounts.userId, userId),
      eq(tempAccounts.isActive, true),
      gt(tempAccounts.expiresAt, new Date())
    ),
  });

  return !!tempAccount;
}

/**
 * 获取临时用户的详细信息
 */
export async function getTempUserInfo(userId: string): Promise<{
  isTempUser: boolean;
  mode?: string;
  emailDomain?: string;
  emailLimit?: number;
  cardKeyId?: string;
} | null> {
  const db = createDb();

  const tempAccount = await db.query.tempAccounts.findFirst({
    where: and(
      eq(tempAccounts.userId, userId),
      eq(tempAccounts.isActive, true),
      gt(tempAccounts.expiresAt, new Date())
    ),
    with: {
      cardKey: true,
    },
  });

  if (!tempAccount) {
    return { isTempUser: false };
  }

  return {
    isTempUser: true,
    mode: tempAccount.cardKey.mode,
    emailDomain: tempAccount.cardKey.emailDomain || undefined,
    emailLimit: tempAccount.cardKey.emailLimit || undefined,
    cardKeyId: tempAccount.cardKeyId,
  };
}

/**
 * 获取临时用户绑定的邮箱地址
 */
export async function getTempUserEmailAddress(
  userId: string
): Promise<string | null> {
  const db = createDb();

  const tempAccount = await db.query.tempAccounts.findFirst({
    where: and(
      eq(tempAccounts.userId, userId),
      eq(tempAccounts.isActive, true),
      gt(tempAccounts.expiresAt, new Date())
    ),
  });

  return tempAccount?.emailAddress || null;
}

/**
 * 清理过期的临时账号
 */
export async function cleanupExpiredTempAccounts() {
  const db = createDb();
  const now = new Date();

  // 查找过期的临时账号
  const expiredAccounts = await db.query.tempAccounts.findMany({
    where: and(
      eq(tempAccounts.isActive, true),
      lt(tempAccounts.expiresAt, now)
    ),
  });

  for (const account of expiredAccounts) {
    // 删除用户及相关数据（级联删除会处理邮箱和消息）
    await db.delete(users).where(eq(users.id, account.userId));

    // 标记临时账号为非活跃
    await db
      .update(tempAccounts)
      .set({ isActive: false })
      .where(eq(tempAccounts.id, account.id));
  }

  return expiredAccounts.length;
}

/**
 * 生成批量卡密（单卡密模式）
 */
export async function generateBatchCardKeys(
  emailAddresses: string[],
  expiryMinutes: number = 30 * 24 * 60 // 默认30天
): Promise<{ code: string; emailAddress: string }[]> {
  const db = createDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000); // 转换为毫秒

  // 在生成卡密前,删除这些邮箱地址(如果已存在)
  // 这样卡密激活时才能成功创建邮箱
  for (const emailAddress of emailAddresses) {
    const existingEmail = await db.query.emails.findFirst({
      where: eq(emails.address, emailAddress),
    });

    if (existingEmail) {
      // 删除已存在的邮箱及其消息
      await db.delete(emails).where(eq(emails.id, existingEmail.id));
    }
  }

  const cardKeyData = emailAddresses.map((emailAddress) => ({
    code: generateCardKeyCode(),
    emailAddress,
    mode: "single",
    emailDomain: null,
    emailLimit: 1,
    expiresAt,
    createdAt: now,
  }));

  await db.insert(cardKeys).values(cardKeyData);

  return cardKeyData.map(({ code, emailAddress }) => ({ code, emailAddress }));
}

/**
 * 生成多卡密模式的卡密
 * @param emailAddresses 邮箱地址列表
 * @param expiryMinutes 有效期（分钟）
 */
export async function generateMultiCardKey(
  emailAddresses: string[],
  expiryMinutes: number = 30 * 24 * 60
): Promise<{ code: string; emailAddresses: string[] }> {
  const db = createDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expiryMinutes * 60 * 1000);

  // 在生成卡密前,删除这些邮箱地址(如果已存在)
  // 这样卡密激活时才能成功创建邮箱
  for (const emailAddress of emailAddresses) {
    const existingEmail = await db.query.emails.findFirst({
      where: eq(emails.address, emailAddress),
    });

    if (existingEmail) {
      // 删除已存在的邮箱及其消息
      await db.delete(emails).where(eq(emails.id, existingEmail.id));
    }
  }

  const code = generateCardKeyCode();

  // 提取域名（假设所有邮箱使用同一个域名）
  const emailDomain = emailAddresses[0].split("@")[1];

  await db.insert(cardKeys).values({
    code,
    emailAddress: emailAddresses.join(","), // 存储所有邮箱地址，用逗号分隔
    mode: "multi",
    emailDomain,
    emailLimit: emailAddresses.length,
    expiresAt,
    createdAt: now,
  });

  return { code, emailAddresses };
}

import { createDb } from "./db";
import { cardKeys, tempAccounts, users, emails, roles, userRoles } from "./schema";
import { eq, and, lt, gt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { ROLES } from "./permissions";

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
  const db = await createDb();

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
 * 所有写操作通过 db.batch() 原子执行，避免中途失败导致数据不一致
 */
export async function activateCardKey(code: string) {
  const db = await createDb();

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
    // 已有用户，批量更新过期时间 + 标记卡密
    userId = existingTempAccount.userId;

    await db.batch([
      db.update(tempAccounts)
        .set({ expiresAt, isActive: true })
        .where(eq(tempAccounts.id, existingTempAccount.id)),
      db.update(emails)
        .set({ expiresAt })
        .where(eq(emails.userId, userId)),
      db.update(cardKeys)
        .set({ isUsed: true, usedBy: userId, usedAt: now })
        .where(eq(cardKeys.id, cardKey.id)),
    ]);
  } else {
    // 创建新的临时用户 — 预生成所有 ID，一次性 batch 写入

    // Phase 1: 只读查询
    const tempRole = await db.query.roles.findFirst({
      where: eq(roles.name, ROLES.TEMP_USER),
    });

    if (cardKey.mode === "multi") {
      const addrs = cardKey.emailAddress
        .split(",")
        .map((a) => a.trim())
        .filter((a) => a.length > 0);
      if (addrs.length === 0) {
        throw new Error("多卡密模式下没有有效的邮箱地址");
      }
    }

    // Phase 2: 预生成 ID
    userId = crypto.randomUUID();
    const roleId = tempRole?.id || crypto.randomUUID();

    const userName =
      cardKey.mode === "single"
        ? `临时用户_${cardKey.emailAddress.split("@")[0]}`
        : `临时用户_${nanoid(6)}`;

    const userEmail =
      cardKey.mode === "single"
        ? cardKey.emailAddress
        : `temp_${nanoid(8)}@${cardKey.emailDomain || "temp.local"}`;

    // Phase 3: 构建写操作数组
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const writes: any[] = [];

    // 如果角色不存在，先创建
    if (!tempRole) {
      writes.push(
        db.insert(roles).values({
          id: roleId,
          name: ROLES.TEMP_USER,
          description: "临时用户，只能访问绑定的邮箱",
        })
      );
    }

    // 创建用户
    writes.push(
      db.insert(users).values({
        id: userId,
        name: userName,
        email: userEmail,
        username: `temp_${nanoid(8)}`,
      })
    );

    // 分配角色
    writes.push(
      db.delete(userRoles).where(eq(userRoles.userId, userId)),
      db.insert(userRoles).values({ userId, roleId })
    );

    // 创建邮箱
    if (cardKey.mode === "single") {
      writes.push(
        db.insert(emails).values({
          address: cardKey.emailAddress,
          userId,
          createdAt: now,
          expiresAt,
        })
      );
    } else if (cardKey.mode === "multi") {
      const emailAddresses = cardKey.emailAddress
        .split(",")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      writes.push(
        db.insert(emails).values(
          emailAddresses.map((address) => ({
            address,
            userId,
            createdAt: now,
            expiresAt,
          }))
        )
      );
    }

    // 创建临时账号记录
    writes.push(
      db.insert(tempAccounts).values({
        userId,
        cardKeyId: cardKey.id,
        emailAddress:
          cardKey.mode === "single" ? cardKey.emailAddress : cardKey.emailDomain!,
        createdAt: now,
        expiresAt,
      })
    );

    // 标记卡密已使用
    writes.push(
      db.update(cardKeys)
        .set({ isUsed: true, usedBy: userId, usedAt: now })
        .where(eq(cardKeys.id, cardKey.id))
    );

    // 原子执行所有写操作
    await db.batch(writes as [typeof writes[0], ...typeof writes]);
  }

  return {
    userId,
    emailAddress:
      cardKey.mode === "single"
        ? cardKey.emailAddress
        : `${cardKey.emailLimit}个邮箱: ${cardKey.emailAddress}`,
    mode: cardKey.mode,
    emailDomain: cardKey.emailDomain,
    emailLimit: cardKey.emailLimit,
    expiresAt,
  };
}

/**
 * 检查用户是否为临时用户
 */
export async function isTempUser(userId: string): Promise<boolean> {
  const db = await createDb();

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
  const db = await createDb();

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
  const db = await createDb();

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
  const db = await createDb();
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
  const db = await createDb();
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
  const db = await createDb();
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

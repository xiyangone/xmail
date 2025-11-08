import { NextResponse } from "next/server";
import { createDb } from "@/lib/db";
import { emails } from "@/lib/schema";
import { eq, and, gt, sql } from "drizzle-orm";
import { EXPIRY_OPTIONS } from "@/types/email";
import { EMAIL_CONFIG } from "@/config";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { getUserId } from "@/lib/apiKey";
import { getUserRole } from "@/lib/auth";
import { ROLES } from "@/lib/permissions";
import { getTempUserInfo } from "@/lib/card-keys";
import { generateEmailPrefix } from "@/lib/email-generator";
import type { EmailPrefixFormat } from "@/config/email";

export const runtime = "edge";

export async function POST(request: Request) {
  const db = createDb();
  const env = getRequestContext().env;

  const userId = await getUserId();
  const userRole = await getUserRole(userId!);

  // 检查是否为临时用户 - 临时用户不能创建新邮箱
  const tempUserInfo = await getTempUserInfo(userId!);
  if (tempUserInfo?.isTempUser) {
    return NextResponse.json(
      { error: "临时用户无法创建新邮箱，只能使用卡密激活时分配的邮箱地址" },
      { status: 403 }
    );
  }

  try {
    if (userRole !== ROLES.EMPEROR) {
      const maxEmails =
        (await env.SITE_CONFIG.get("MAX_EMAILS")) ||
        EMAIL_CONFIG.MAX_ACTIVE_EMAILS.toString();
      const activeEmailsCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(emails)
        .where(
          and(eq(emails.userId, userId!), gt(emails.expiresAt, new Date()))
        );

      if (Number(activeEmailsCount[0].count) >= Number(maxEmails)) {
        return NextResponse.json(
          { error: `已达到最大邮箱数量限制 (${maxEmails})` },
          { status: 403 }
        );
      }
    }

    const { name, expiryTime, domain } = await request.json<{
      name: string;
      expiryTime: number;
      domain: string;
    }>();

    if (!EXPIRY_OPTIONS.some((option) => option.value === expiryTime)) {
      return NextResponse.json({ error: "无效的过期时间" }, { status: 400 });
    }

    // 验证域名
    let domains: string[];
    if (tempUserInfo?.isTempUser && tempUserInfo.mode === "multi") {
      // 多卡密模式的临时用户只能使用指定的域名
      domains = tempUserInfo.emailDomain ? [tempUserInfo.emailDomain] : [];
    } else {
      // 普通用户可以使用所有配置的域名
      const domainString = await env.SITE_CONFIG.get("EMAIL_DOMAINS");
      domains = domainString ? domainString.split(",") : ["moemail.app"];
    }

    if (!domains || !domains.includes(domain)) {
      return NextResponse.json({ 
        error: tempUserInfo?.isTempUser && tempUserInfo.mode === "multi" 
          ? `多卡密临时用户只能使用域名：${tempUserInfo.emailDomain}` 
          : "无效的域名" 
      }, { status: 400 });
    }

    // 获取前缀配置
    const prefixLengthStr = await env.SITE_CONFIG.get("EMAIL_PREFIX_LENGTH");
    const prefixLength = prefixLengthStr
      ? parseInt(prefixLengthStr)
      : EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH;

    const prefixFormat = (await env.SITE_CONFIG.get("EMAIL_PREFIX_FORMAT")) as EmailPrefixFormat || EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT;

    // 生成邮箱地址
    let localPart = name;
    if (!localPart || localPart.trim() === "") {
      localPart = generateEmailPrefix(prefixFormat, prefixLength);
    }
    const address = `${localPart}@${domain}`;
    const existingEmail = await db.query.emails.findFirst({
      where: eq(sql`LOWER(${emails.address})`, address.toLowerCase()),
    });

    if (existingEmail) {
      return NextResponse.json(
        { error: "该邮箱地址已被使用" },
        { status: 409 }
      );
    }

    const now = new Date();
    const expires =
      expiryTime === 0
        ? new Date("9999-01-01T00:00:00.000Z")
        : new Date(now.getTime() + expiryTime);

    const emailData: typeof emails.$inferInsert = {
      address,
      createdAt: now,
      expiresAt: expires,
      userId: userId!,
    };

    const result = await db
      .insert(emails)
      .values(emailData)
      .returning({ id: emails.id, address: emails.address });

    return NextResponse.json({
      id: result[0].id,
      email: result[0].address,
    });
  } catch (error) {
    console.error("Failed to generate email:", error);
    return NextResponse.json({ error: "创建邮箱失败" }, { status: 500 });
  }
}

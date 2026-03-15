import { NextResponse } from "next/server";
import { auth, checkPermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { generateBatchCardKeys, generateMultiCardKey } from "@/lib/card-keys";
import { z } from "zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";


const generateSingleCardKeysSchema = z.object({
  mode: z.literal("single"),
  emailAddresses: z
    .array(z.string().email("无效的邮箱地址"))
    .min(1, "至少需要一个邮箱地址"),
  expiryMinutes: z
    .number()
    .min(1, "有效期必须大于0分钟")
    .default(30 * 24 * 60),
});

const generateMultiCardKeySchema = z.object({
  mode: z.literal("multi"),
  emailAddresses: z
    .array(z.string().email("无效的邮箱地址"))
    .min(1, "至少需要一个邮箱地址"),
  expiryMinutes: z
    .number()
    .min(1, "有效期必须大于0分钟")
    .default(30 * 24 * 60),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 });
    }

    // 检查权限 - 只有皇帝可以生成卡密
    const hasPermission = await checkPermission(PERMISSIONS.MANAGE_CARD_KEYS);
    if (!hasPermission) {
      return NextResponse.json(
        { error: "权限不足，只有皇帝可以生成卡密" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      mode?: string;
      [key: string]: unknown;
    };
    const { env } = await getCloudflareContext();
    const domainString = await env.SITE_CONFIG.get("EMAIL_DOMAINS");
    const allowedDomains = domainString
      ? domainString.split(",").map((d) => d.trim())
      : ["moemail.app"];

    // 根据模式验证不同的schema
    if (body.mode === "single") {
      const validation = generateSingleCardKeysSchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const { emailAddresses, expiryMinutes } = validation.data;

      // 验证所有邮箱地址的域名是否在允许的域名列表中
      const invalidEmails: string[] = [];
      for (const email of emailAddresses) {
        const domain = email.split("@")[1];
        if (!domain || !allowedDomains.includes(domain)) {
          invalidEmails.push(email);
        }
      }

      if (invalidEmails.length > 0) {
        return NextResponse.json(
          {
            error: `以下邮箱地址的域名不在系统允许的域名列表中：${invalidEmails.join(
              ", "
            )}。\n允许的域名：${allowedDomains.join(", ")}`,
          },
          { status: 400 }
        );
      }

      // 生成单卡密
      const cardKeys = await generateBatchCardKeys(
        emailAddresses,
        expiryMinutes
      );

      return NextResponse.json({
        success: true,
        cardKeys,
        message: `成功生成 ${cardKeys.length} 个单卡密`,
      });
    } else if (body.mode === "multi") {
      const validation = generateMultiCardKeySchema.safeParse(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.errors[0].message },
          { status: 400 }
        );
      }

      const { emailAddresses, expiryMinutes } = validation.data;

      // 验证所有邮箱地址的域名是否在允许的域名列表中
      const invalidEmails: string[] = [];
      for (const email of emailAddresses) {
        const domain = email.split("@")[1];
        if (!domain || !allowedDomains.includes(domain)) {
          invalidEmails.push(email);
        }
      }

      if (invalidEmails.length > 0) {
        return NextResponse.json(
          {
            error: `以下邮箱地址的域名不在系统允许的域名列表中：${invalidEmails.join(
              ", "
            )}。\n允许的域名：${allowedDomains.join(", ")}`,
          },
          { status: 400 }
        );
      }

      // 生成多卡密（一个卡密绑定多个邮箱地址）
      const cardKey = await generateMultiCardKey(emailAddresses, expiryMinutes);

      return NextResponse.json({
        success: true,
        cardKeys: [
          {
            code: cardKey.code,
            emailAddress: `${
              emailAddresses.length
            }个邮箱: ${emailAddresses.join(", ")}`,
          },
        ],
        message: `成功生成1个多卡密（绑定${emailAddresses.length}个邮箱）`,
      });
    } else {
      return NextResponse.json({ error: "无效的卡密模式" }, { status: 400 });
    }
  } catch (error) {
    console.error("生成卡密失败:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "生成卡密失败" },
      { status: 500 }
    );
  }
}

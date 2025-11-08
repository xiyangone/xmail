import { NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { EMAIL_CONFIG } from "@/config";
import { generateEmailPrefix } from "@/lib/email-generator";
import type { EmailPrefixFormat } from "@/config/email";

export const runtime = "edge";

/**
 * 预览生成的邮箱前缀
 * 用于前端刷新按钮，根据当前配置生成一个示例前缀
 */
export async function GET() {
  try {
    const env = getRequestContext().env;

    // 获取前缀配置
    const prefixLengthStr = await env.SITE_CONFIG.get("EMAIL_PREFIX_LENGTH");
    const prefixLength = prefixLengthStr
      ? parseInt(prefixLengthStr)
      : EMAIL_CONFIG.DEFAULT_PREFIX_LENGTH;

    const prefixFormat = (await env.SITE_CONFIG.get("EMAIL_PREFIX_FORMAT")) as EmailPrefixFormat || EMAIL_CONFIG.DEFAULT_PREFIX_FORMAT;

    // 生成前缀
    const prefix = generateEmailPrefix(prefixFormat, prefixLength);

    return NextResponse.json({ prefix });
  } catch (error) {
    console.error("Failed to preview prefix:", error);
    return NextResponse.json(
      { error: "Failed to generate prefix" },
      { status: 500 }
    );
  }
}

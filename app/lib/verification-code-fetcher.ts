/**
 * 智能验证码获取工具
 * 从邮件列表中智能提取验证码
 */

import { extractVerificationCodeFromMessage } from "./verification-code";

export interface VerificationCodeConfig {
  emailId: string;
  fromAddress?: string; // 可选的发件人地址过滤
  verificationCodeInterval?: number; // 验证码获取间隔(毫秒)
  verificationCodeTimeout?: number; // 验证码获取超时时间(毫秒)
  baseUrl?: string; // 服务端调用时的站点地址
  apiKey?: string; // 服务端获取邮件时透传 API Key
}

export interface Message {
  id: string;
  from_address?: string;
  subject?: string;
  content?: string;
  html?: string;
  received_at?: number;
}

/**
 * 智能获取验证码
 * 1. 首先尝试从邮件列表中查找指定发件人的邮件
 * 2. 从邮件中提取验证码
 * 3. 如果没有找到或超时,返回 null
 *
 * @param config 验证码获取配置
 * @returns 验证码字符串或 null
 */
export async function getVerificationCode(
  config: VerificationCodeConfig
): Promise<string | null> {
  const {
    emailId,
    fromAddress,
    verificationCodeInterval = 3000,
    verificationCodeTimeout = 60000,
    baseUrl,
    apiKey,
  } = config;

  const startTime = Date.now();

  try {
    while (true) {
      // 获取邮件列表
      const emails = await getEmailList({ emailId, baseUrl, apiKey });

      // 筛选邮件：如果指定了发件人地址，只检查匹配的邮件
      const targetEmails = fromAddress
        ? emails.filter((e) => e.from_address?.includes(fromAddress))
        : emails; // 如果没有指定发件人，检查所有邮件

      // 遍历邮件列表，从最新到最旧，找到第一个包含验证码的邮件
      for (const email of targetEmails) {
        const code = extractVerificationCodeFromMessage(email);
        if (code) {
          console.log(
            `[REGISTER] 获取到验证码: ${code} (来自: ${
              email.from_address || "未知"
            })`
          );
          return code;
        }
      }

      // 检查是否超时
      const elapsed = Date.now() - startTime;
      if (elapsed > verificationCodeTimeout) {
        throw new Error(`获取验证码超时 (${config.verificationCodeTimeout}ms)`);
      }

      // 等待一段时间后重试
      await delay(verificationCodeInterval);
    }
  } catch (error: unknown) {
    console.error("[REGISTER] 获取验证码失败:", error);
    throw error;
  }
}

/**
 * 获取邮件列表
 * @param params 查询参数
 * @returns 邮件列表
 */
async function getEmailList(params: {
  emailId: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<Message[]> {
  try {
    const url = new URL(
      `/api/emails/${params.emailId}`,
      params.baseUrl ||
        (typeof window !== "undefined"
          ? window.location.origin
          : "http://localhost")
    );

    const headers = params.apiKey ? { "X-API-Key": params.apiKey } : undefined;

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`获取邮件列表失败: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      messages: Message[];
      nextCursor: string | null;
      total: number;
    };

    return data.messages || [];
  } catch (error) {
    console.error("获取邮件列表失败:", error);
    return [];
  }
}

/**
 * 延迟函数
 * @param ms 延迟时间(毫秒)
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

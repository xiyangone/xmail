/**
 * 智能验证码获取工具
 * - 轮询邮件列表
 * - 提取验证码（正文/HTML/标题）
 */

import { extractVerificationCodeFromMessage } from "./verification-code";

export interface VerificationCodeConfig {
  emailId: string;
  fromAddress?: string;
  verificationCodeInterval?: number; // 轮询间隔(毫秒)
  verificationCodeTimeout?: number; // 超时时间(毫秒)
  baseUrl?: string; // 服务端调用时必须传入站点 baseUrl
  apiKey?: string; // 透传 API Key，用于服务端拉取邮件列表
}

export interface Message {
  id: string;
  from_address?: string;
  subject?: string;
  content?: string;
  html?: string;
  received_at?: number;
}

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
      const emailList = await getEmailList({ emailId, baseUrl, apiKey });

      const targetEmails = fromAddress
        ? emailList.filter((e) => e.from_address?.includes(fromAddress))
        : emailList;

      for (const email of targetEmails) {
        const code = extractVerificationCodeFromMessage(email);
        if (code) {
          console.log(
            `[REGISTER] 获取到验证码: ${code} (来自: ${email.from_address || "未知"})`
          );
          return code;
        }
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > verificationCodeTimeout) {
        console.log(`[REGISTER] 获取验证码超时 (${verificationCodeTimeout}ms)`);
        return null;
      }

      await delay(verificationCodeInterval);
    }
  } catch (error: unknown) {
    console.error("[REGISTER] 获取验证码失败:", error);
    throw error;
  }
}

async function getEmailList(params: {
  emailId: string;
  baseUrl?: string;
  apiKey?: string;
}): Promise<Message[]> {
  const resolvedBaseUrl =
    params.baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : null);

  if (!resolvedBaseUrl) {
    throw new Error("baseUrl is required when fetching emails on the server");
  }

  const url = new URL(`/api/emails/${params.emailId}`, resolvedBaseUrl);
  const headers = params.apiKey ? { "X-API-Key": params.apiKey } : undefined;

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch emails: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as {
    messages: Message[];
    nextCursor: string | null;
    total: number;
  };

  return data.messages ?? [];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

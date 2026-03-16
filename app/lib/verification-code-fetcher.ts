/**
 * Verification code polling helper.
 * - Polls the mailbox message list
 * - Extracts the code from text / HTML / subject
 */

import { extractVerificationCodeFromMessage } from "./verification-code";

export interface VerificationCodeConfig {
  emailId: string;
  fromAddress?: string;
  verificationCodeInterval?: number;
  verificationCodeTimeout?: number;
  baseUrl?: string;
  apiKey?: string;
  requestHeaders?: HeadersInit;
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
    requestHeaders,
  } = config;

  const startTime = Date.now();

  try {
    while (true) {
      const emailList = await getEmailList({
        emailId,
        baseUrl,
        apiKey,
        requestHeaders,
      });

      const targetEmails = fromAddress
        ? emailList.filter((email) => email.from_address?.includes(fromAddress))
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
  requestHeaders?: HeadersInit;
}): Promise<Message[]> {
  const resolvedBaseUrl =
    params.baseUrl ??
    (typeof window !== "undefined" ? window.location.origin : null);

  if (!resolvedBaseUrl) {
    throw new Error("baseUrl is required when fetching emails on the server");
  }

  const url = new URL(`/api/emails/${params.emailId}`, resolvedBaseUrl);
  const headers = new Headers(params.requestHeaders);
  if (params.apiKey && !headers.has("X-API-Key")) {
    headers.set("X-API-Key", params.apiKey);
  }

  const response = await fetch(url.toString(), {
    headers,
    cache: "no-store",
  });
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

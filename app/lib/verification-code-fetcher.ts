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

export type VerificationCodeFailureReason =
  | "timeout_no_messages"
  | "timeout_no_sender_match"
  | "timeout_no_code_match"
  | "mailbox_fetch_failed";

export interface VerificationCodeStats {
  timeoutMs: number;
  intervalMs: number;
  messagesSeen: number;
  senderMatchedMessages: number;
  lastMessageAt: number | null;
  fromAddress: string | null;
}

export type VerificationCodeResult =
  | {
      success: true;
      code: string;
      stats: VerificationCodeStats;
    }
  | {
      success: false;
      reason: VerificationCodeFailureReason;
      error: string;
      hint: string;
      stats: VerificationCodeStats;
    };

export async function getVerificationCode(
  config: VerificationCodeConfig
): Promise<VerificationCodeResult> {
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
  const seenMessageIds = new Set<string>();
  const senderMatchedMessageIds = new Set<string>();
  let lastMessageAt: number | null = null;
  const stats: VerificationCodeStats = {
    timeoutMs: verificationCodeTimeout,
    intervalMs: verificationCodeInterval,
    messagesSeen: 0,
    senderMatchedMessages: 0,
    lastMessageAt: null,
    fromAddress: fromAddress ?? null,
  };

  try {
    while (true) {
      let emailList: Message[];
      try {
        emailList = await getEmailList({
          emailId,
          baseUrl,
          apiKey,
          requestHeaders,
        });
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          /baseUrl is required/i.test(error.message)
        ) {
          throw error;
        }
        console.error("[REGISTER] 获取验证码失败:", error);
        return createFailureResult("mailbox_fetch_failed", stats);
      }

      for (const email of emailList) {
        seenMessageIds.add(email.id);
        if (
          typeof email.received_at === "number" &&
          (lastMessageAt === null || email.received_at > lastMessageAt)
        ) {
          lastMessageAt = email.received_at;
        }
      }

      const targetEmails = fromAddress
        ? emailList.filter((email) => email.from_address?.includes(fromAddress))
        : emailList;

      for (const email of targetEmails) {
        senderMatchedMessageIds.add(email.id);
      }

      stats.messagesSeen = seenMessageIds.size;
      stats.senderMatchedMessages = senderMatchedMessageIds.size;
      stats.lastMessageAt = lastMessageAt;

      for (const email of targetEmails) {
        const code = extractVerificationCodeFromMessage(email);
        if (code) {
          console.log(
            `[REGISTER] 获取到验证码: ${code} (来自: ${email.from_address || "未知"})`
          );
          return {
            success: true,
            code,
            stats,
          };
        }
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > verificationCodeTimeout) {
        console.log(`[REGISTER] 获取验证码超时 (${verificationCodeTimeout}ms)`);
        return createFailureResult(
          resolveTimeoutReason(
            seenMessageIds.size,
            senderMatchedMessageIds.size,
            fromAddress
          ),
          stats
        );
      }

      await delay(verificationCodeInterval);
    }
  } catch (error: unknown) {
    console.error("[REGISTER] 获取验证码失败:", error);
    throw error;
  }
}

function resolveTimeoutReason(
  messagesSeen: number,
  senderMatchedMessages: number,
  fromAddress?: string
): VerificationCodeFailureReason {
  if (messagesSeen === 0) {
    return "timeout_no_messages";
  }

  if (fromAddress && senderMatchedMessages === 0) {
    return "timeout_no_sender_match";
  }

  return "timeout_no_code_match";
}

function createFailureResult(
  reason: VerificationCodeFailureReason,
  stats: VerificationCodeStats
): Extract<VerificationCodeResult, { success: false }> {
  switch (reason) {
    case "timeout_no_messages":
      return {
        success: false,
        reason,
        error: "在等待时间内未收到新邮件",
        hint: "请确认目标服务已经发信，或适当延长 timeout 后重试",
        stats,
      };
    case "timeout_no_sender_match":
      return {
        success: false,
        reason,
        error: "已收到邮件，但没有匹配指定发件人的邮件",
        hint: "请检查 fromAddress 是否正确，或去掉发件人过滤后重试",
        stats,
      };
    case "timeout_no_code_match":
      return {
        success: false,
        reason,
        error: "已收到邮件，但未能识别出验证码",
        hint: "请直接查看邮件正文确认验证码格式，或适当延长 timeout 后重试",
        stats,
      };
    case "mailbox_fetch_failed":
      return {
        success: false,
        reason,
        error: "读取邮箱消息失败",
        hint: "请稍后重试；如果持续失败，请检查邮箱接口或鉴权状态",
        stats,
      };
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

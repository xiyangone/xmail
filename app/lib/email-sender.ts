export type EmailSendProvider = "resend" | "cloudflare";

export interface EmailSendInput {
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
}

export interface ResendEmailPayload {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text: string;
  reply_to: string;
}

export interface CloudflareEmailPayload {
  from: {
    address: string;
    name: string;
  };
  to: string;
  reply_to: string;
  subject: string;
  html: string;
  text: string;
}

const SENDER_DISPLAY_NAME = "XiYang Mail";

export function normalizeEmailProvider(
  provider: string | null | undefined
): EmailSendProvider {
  return provider === "cloudflare" ? "cloudflare" : "resend";
}

export function stripHtmlForEmailText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n\s+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function buildResendEmailPayload(input: EmailSendInput): ResendEmailPayload {
  return {
    from: `${SENDER_DISPLAY_NAME} <${input.fromEmail}>`,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: stripHtmlForEmailText(input.html),
    reply_to: input.fromEmail,
  };
}

export function buildCloudflareEmailPayload(
  input: EmailSendInput
): CloudflareEmailPayload {
  return {
    from: {
      address: input.fromEmail,
      name: SENDER_DISPLAY_NAME,
    },
    to: input.to,
    reply_to: input.fromEmail,
    subject: input.subject,
    html: input.html,
    text: stripHtmlForEmailText(input.html),
  };
}

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as {
      message?: string;
      errors?: Array<{ message?: string }>;
    };
    return data.message || data.errors?.[0]?.message || fallback;
  } catch {
    return fallback;
  }
}

async function readCloudflareResponse(response: Response) {
  try {
    return (await response.json()) as {
      success?: boolean;
      errors?: Array<{ message?: string }>;
      messages?: Array<{ message?: string }>;
    };
  } catch {
    return null;
  }
}

export async function sendWithResend(
  input: EmailSendInput,
  config: { apiKey: string }
) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(buildResendEmailPayload(input)),
  });

  if (!response.ok) {
    const message = await readErrorMessage(
      response,
      "Resend发送失败，请稍后重试"
    );
    throw new Error(message);
  }
}

export async function sendWithCloudflare(
  input: EmailSendInput,
  config: { accountId: string; apiToken: string }
) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/email/sending/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiToken}`,
      },
      body: JSON.stringify(buildCloudflareEmailPayload(input)),
    }
  );

  const data = await readCloudflareResponse(response);
  if (!response.ok || data?.success === false) {
    const message =
      data?.errors?.[0]?.message ||
      data?.messages?.[0]?.message ||
      "Cloudflare发送失败，请稍后重试";
    throw new Error(message);
  }
}

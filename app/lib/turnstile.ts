import { getCloudflareContext } from "@opennextjs/cloudflare";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * 服务端验证 Turnstile token
 * 需要在 Cloudflare 环境变量中配置 TURNSTILE_SECRET_KEY
 * 如果未配置 secret key，跳过验证（方便开发环境）
 */
export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteip?: string | null
): Promise<{ success: boolean; error?: string }> {
  const { env } = await getCloudflareContext();
  const secretKey = env.TURNSTILE_SECRET_KEY;

  // 未配置 secret key 时跳过验证（开发环境）
  if (!secretKey) {
    return { success: true };
  }

  if (!token) {
    return { success: false, error: "请完成人机验证" };
  }

  try {
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);
    if (remoteip) {
      formData.append("remoteip", remoteip);
    }

    const result = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
    });

    const outcome = (await result.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!outcome.success) {
      return { success: false, error: "人机验证失败，请重试" };
    }

    return { success: true };
  } catch {
    return { success: false, error: "人机验证服务异常" };
  }
}

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sql } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { canViewOperations } from "@/lib/operations-api";

interface DiagnosticCheck {
  key: string;
  label: string;
  status: "ok" | "missing" | "failed";
  message: string;
}

function configured(value: string | undefined | null) {
  return Boolean(value?.trim());
}

function configStatus(key: string, label: string, enabled: boolean, configuredMessage: string, missingMessage: string): DiagnosticCheck {
  return {
    key,
    label,
    status: enabled ? "ok" : "missing",
    message: enabled ? configuredMessage : missingMessage,
  };
}

export async function GET() {
  try {
    if (!(await canViewOperations())) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const checks: DiagnosticCheck[] = [];

    try {
      const db = await createDb();
      await db.get(sql`select 1 as ok`);
      checks.push({ key: "db", label: "D1 Database", status: "ok", message: "D1 可读取。" });
    } catch (error) {
      checks.push({
        key: "db",
        label: "D1 Database",
        status: "failed",
        message: error instanceof Error ? error.message : "D1 检测失败。",
      });
    }

    try {
      const { env } = await getCloudflareContext();
      const [emailServiceEnabled, resendApiKey] = await Promise.all([
        env.SITE_CONFIG.get("EMAIL_SERVICE_ENABLED"),
        env.SITE_CONFIG.get("RESEND_API_KEY"),
      ]);

      checks.push({ key: "kv", label: "SITE_CONFIG KV", status: "ok", message: "KV 可读取。" });
      checks.push(
        configStatus(
          "resend",
          "Resend Email Service",
          emailServiceEnabled === "true" && configured(resendApiKey),
          "Resend 已启用且 API Key 已配置。",
          "Resend 未启用或 API Key 未配置。"
        )
      );
      checks.push(
        configStatus(
          "internal-worker-secret",
          "Internal Worker Secret",
          configured(env.INTERNAL_WORKER_SECRET) || configured(process.env.INTERNAL_WORKER_SECRET),
          "内部 Worker token 已配置。",
          "内部 Worker token 未配置，定时 Worker 不能通过内部策略调用。"
        )
      );
    } catch (error) {
      checks.push({
        key: "kv",
        label: "SITE_CONFIG KV",
        status: "failed",
        message: error instanceof Error ? error.message : "KV 检测失败。",
      });
    }

    checks.push(
      configStatus(
        "turnstile",
        "Cloudflare Turnstile",
        configured(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) && configured(process.env.TURNSTILE_SECRET_KEY),
        "Turnstile 站点密钥和服务端密钥已配置。",
        "Turnstile 未完整配置。"
      )
    );
    checks.push(
      configStatus(
        "github-oauth",
        "GitHub OAuth",
        configured(process.env.AUTH_GITHUB_ID) && configured(process.env.AUTH_GITHUB_SECRET),
        "GitHub OAuth 已配置。",
        "GitHub OAuth 未完整配置。"
      )
    );
    checks.push(
      configStatus(
        "auth-secret",
        "Auth Secret",
        configured(process.env.AUTH_SECRET),
        "AUTH_SECRET 已配置。",
        "AUTH_SECRET 未配置。"
      )
    );

    return NextResponse.json({
      checks,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("配置诊断失败:", error);
    return NextResponse.json({ error: "配置诊断失败" }, { status: 500 });
  }
}

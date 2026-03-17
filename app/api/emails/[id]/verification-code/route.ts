import { NextResponse } from "next/server";
import { createDb } from "@/lib/db";
import { emails } from "@/lib/schema";
import { and, eq } from "drizzle-orm";
import { getUserId } from "@/lib/apiKey";
import { getVerificationCode } from "@/lib/verification-code-fetcher";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "未授权", success: false },
        { status: 401 }
      );
    }

    const { id } = await params;
    const db = await createDb();
    const origin = new URL(request.url).origin;
    const apiKey = request.headers.get("x-api-key") ?? undefined;
    const cookie = request.headers.get("cookie");

    const email = await db.query.emails.findFirst({
      where: and(eq(emails.id, id), eq(emails.userId, userId)),
    });

    if (!email) {
      return NextResponse.json(
        { error: "无权访问此邮箱", success: false },
        { status: 403 }
      );
    }

    let body: { fromAddress?: string; interval?: number; timeout?: number };
    try {
      body = (await request.json()) as typeof body;
    } catch {
      body = {};
    }

    const interval =
      typeof body.interval === "number" && Number.isFinite(body.interval)
        ? Math.max(250, Math.floor(body.interval))
        : 3000;
    const timeout =
      typeof body.timeout === "number" && Number.isFinite(body.timeout)
        ? Math.max(1000, Math.floor(body.timeout))
        : 60000;

    const requestHeaders = new Headers();
    if (cookie) {
      requestHeaders.set("cookie", cookie);
    }
    if (apiKey) {
      requestHeaders.set("x-api-key", apiKey);
    }

    const result = await getVerificationCode({
      emailId: id,
      fromAddress: body.fromAddress,
      verificationCodeInterval: interval,
      verificationCodeTimeout: timeout,
      baseUrl: origin,
      apiKey,
      requestHeaders,
    });

    if (!result.success) {
      const status =
        result.reason === "mailbox_fetch_failed" ? 500 : 404;

      return NextResponse.json(
        {
          error: result.error,
          hint: result.hint,
          reason: result.reason,
          stats: result.stats,
          success: false,
        },
        { status }
      );
    }

    return NextResponse.json({ code: result.code, success: true });
  } catch (error) {
    console.error("获取验证码失败:", error);
    return NextResponse.json(
      {
        error: "读取邮箱消息失败",
        hint: "请稍后重试；如果持续失败，请检查邮箱接口或鉴权状态",
        reason: "mailbox_fetch_failed",
        success: false,
      },
      { status: 500 }
    );
  }
}

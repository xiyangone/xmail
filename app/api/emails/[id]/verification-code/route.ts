import { NextResponse } from "next/server";
import { createDb } from "@/lib/db";
import { emails } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { getUserId } from "@/lib/apiKey";
import { getVerificationCode } from "@/lib/verification-code-fetcher";

export const runtime = "edge";

/**
 * 智能获取验证码 API
 * POST /api/emails/[id]/verification-code
 * 
 * 请求体:
 * {
 *   "fromAddress": "verify.windsurf.ai", // 可选,发件人地址过滤
 *   "interval": 3000, // 可选,轮询间隔(毫秒)
 *   "timeout": 60000 // 可选,超时时间(毫秒)
 * }
 * 
 * 响应:
 * {
 *   "code": "123456",
 *   "success": true
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const { id } = await params;
    const db = createDb();

    // 验证邮箱权限
    const email = await db.query.emails.findFirst({
      where: and(eq(emails.id, id), eq(emails.userId, userId!)),
    });

    if (!email) {
      return NextResponse.json({ error: "无权限查看" }, { status: 403 });
    }

    // 解析请求体
    const body = (await request.json()) as {
      fromAddress?: string;
      interval?: number;
      timeout?: number;
    };

    // 获取验证码
    const code = await getVerificationCode({
      emailId: id,
      fromAddress: body.fromAddress,
      verificationCodeInterval: body.interval || 3000,
      verificationCodeTimeout: body.timeout || 60000,
    });

    if (!code) {
      return NextResponse.json(
        { error: "未找到验证码", success: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      code,
      success: true,
    });
  } catch (error) {
    console.error("获取验证码失败:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "获取验证码失败",
        success: false,
      },
      { status: 500 }
    );
  }
}


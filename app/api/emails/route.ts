import { createDb } from "@/lib/db";
import { and, eq, gt, lt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { emails } from "@/lib/schema";
import { encodeCursor, decodeCursor } from "@/lib/cursor";
import { getUserId } from "@/lib/apiKey";


const PAGE_SIZE = 20;

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "未授权" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get("cursor");

  const db = await createDb();

  try {
    const baseConditions = and(
      eq(emails.userId, userId),
      gt(emails.expiresAt, new Date())
    );

    const conditions = [baseConditions];

    if (cursor) {
      const cursorData = decodeCursor(cursor);
      if (!cursorData) {
        return NextResponse.json({ error: "无效的分页参数" }, { status: 400 });
      }
      const { timestamp, id } = cursorData;
      conditions.push(
        or(
          lt(emails.createdAt, new Date(timestamp)),
          and(eq(emails.createdAt, new Date(timestamp)), lt(emails.id, id))
        )
      );
    }

    const results = await db.query.emails.findMany({
      where: and(...conditions),
      orderBy: (emails, { desc }) => [desc(emails.createdAt), desc(emails.id)],
      limit: PAGE_SIZE + 1,
    });

    const hasMore = results.length > PAGE_SIZE;
    const nextCursor = hasMore
      ? encodeCursor(
          results[PAGE_SIZE - 1].createdAt.getTime(),
          results[PAGE_SIZE - 1].id
        )
      : null;
    const emailList = hasMore ? results.slice(0, PAGE_SIZE) : results;

    return NextResponse.json({
      emails: emailList,
      nextCursor,
      total: emailList.length,
    });
  } catch (error) {
    console.error("Failed to fetch user emails:", error);
    return NextResponse.json(
      { error: "Failed to fetch emails" },
      { status: 500 }
    );
  }
}

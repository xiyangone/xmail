import { NextResponse } from "next/server";
import { desc, eq, like, or } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { canViewOperations } from "@/lib/operations-api";
import { workerRuns } from "@/lib/schema";

export async function GET() {
  const canAccess = await canViewOperations();
  if (!canAccess) {
    return NextResponse.json({ error: "权限不足" }, { status: 403 });
  }

  try {
    const db = await createDb();
    const runs = await db.query.workerRuns.findMany({
      where: or(eq(workerRuns.workerName, "cleanup"), like(workerRuns.runType, "%cleanup%")),
      orderBy: desc(workerRuns.startedAt),
      limit: 20,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    console.error("获取清理历史失败:", error);
    return NextResponse.json({ error: "获取清理历史失败" }, { status: 500 });
  }
}

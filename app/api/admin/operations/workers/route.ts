import { NextRequest, NextResponse } from "next/server";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { buildPagination, canViewOperations, getPagination } from "@/lib/operations-api";
import { workerRuns } from "@/lib/schema";

function buildFilters(searchParams: URLSearchParams) {
  const filters: SQL<unknown>[] = [];
  const workerName = searchParams.get("workerName")?.trim();
  const status = searchParams.get("status")?.trim();

  if (workerName) filters.push(eq(workerRuns.workerName, workerName));
  if (status && status !== "all") filters.push(eq(workerRuns.status, status));

  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await canViewOperations())) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { pageSize, requestedPage } = getPagination(searchParams);
    const whereClause = buildFilters(searchParams);
    const db = await createDb();

    const totalResult = await db.select({ value: count() }).from(workerRuns).where(whereClause);
    const pagination = buildPagination(Number(totalResult[0]?.value ?? 0), pageSize, requestedPage);

    const runs =
      pagination.total === 0
        ? []
        : await db
            .select()
            .from(workerRuns)
            .where(whereClause)
            .orderBy(desc(workerRuns.startedAt))
            .limit(pageSize)
            .offset(pagination.offset);

    return NextResponse.json({ runs, pagination });
  } catch (error) {
    console.error("获取 Worker 运行历史失败:", error);
    return NextResponse.json({ error: "获取 Worker 运行历史失败" }, { status: 500 });
  }
}

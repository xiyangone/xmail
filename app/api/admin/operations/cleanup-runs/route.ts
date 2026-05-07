import { NextRequest, NextResponse } from "next/server";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { buildPagination, canViewOperations, getPagination } from "@/lib/operations-api";
import { workerRuns } from "@/lib/schema";

const CLEANUP_WORKERS = ["cleanup", "temp-account-cleanup"];

function buildFilters(searchParams: URLSearchParams) {
  const filters: SQL<unknown>[] = [inArray(workerRuns.workerName, CLEANUP_WORKERS)];
  const status = searchParams.get("status")?.trim();

  if (status && status !== "all") filters.push(eq(workerRuns.status, status));

  return filters.length === 1 ? filters[0] : and(...filters);
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
    console.error("获取清理任务历史失败:", error);
    return NextResponse.json({ error: "获取清理任务历史失败" }, { status: 500 });
  }
}

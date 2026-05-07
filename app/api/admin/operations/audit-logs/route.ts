import { NextRequest, NextResponse } from "next/server";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { buildPagination, canViewAuditLogs, getPagination } from "@/lib/operations-api";
import { adminAuditLogs } from "@/lib/schema";

function buildFilters(searchParams: URLSearchParams) {
  const filters: SQL<unknown>[] = [];
  const action = searchParams.get("action")?.trim();
  const targetType = searchParams.get("targetType")?.trim();
  const search = searchParams.get("search")?.trim();

  if (action && action !== "all") filters.push(eq(adminAuditLogs.action, action));
  if (targetType && targetType !== "all") filters.push(eq(adminAuditLogs.targetType, targetType));
  if (search) {
    const query = `%${search}%`;
    filters.push(
      or(
        like(adminAuditLogs.action, query),
        like(adminAuditLogs.targetType, query),
        like(adminAuditLogs.targetId, query),
        like(adminAuditLogs.summary, query)
      )!
    );
  }

  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await canViewAuditLogs())) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { pageSize, requestedPage } = getPagination(searchParams);
    const whereClause = buildFilters(searchParams);
    const db = await createDb();
    const totalResult = await db.select({ value: count() }).from(adminAuditLogs).where(whereClause);
    const pagination = buildPagination(Number(totalResult[0]?.value ?? 0), pageSize, requestedPage);

    const logs =
      pagination.total === 0
        ? []
        : await db
            .select()
            .from(adminAuditLogs)
            .where(whereClause)
            .orderBy(desc(adminAuditLogs.createdAt))
            .limit(pageSize)
            .offset(pagination.offset);

    return NextResponse.json({ logs, pagination });
  } catch (error) {
    console.error("获取审计日志失败:", error);
    return NextResponse.json({ error: "获取审计日志失败" }, { status: 500 });
  }
}

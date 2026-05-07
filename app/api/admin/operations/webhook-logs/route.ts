import { NextRequest, NextResponse } from "next/server";
import type { SQL } from "drizzle-orm";
import { and, count, desc, eq, like, or } from "drizzle-orm";
import { createDb } from "@/lib/db";
import { buildPagination, canViewWebhookLogs, getPagination } from "@/lib/operations-api";
import { webhookLogs } from "@/lib/schema";

function buildFilters(searchParams: URLSearchParams) {
  const filters: SQL<unknown>[] = [];
  const status = searchParams.get("status")?.trim();
  const search = searchParams.get("search")?.trim();

  if (status && status !== "all") filters.push(eq(webhookLogs.status, status));
  if (search) {
    const query = `%${search}%`;
    filters.push(or(like(webhookLogs.url, query), like(webhookLogs.event, query), like(webhookLogs.errorMessage, query))!);
  }

  if (filters.length === 0) return undefined;
  if (filters.length === 1) return filters[0];
  return and(...filters);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await canViewWebhookLogs())) {
      return NextResponse.json({ error: "权限不足" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const { pageSize, requestedPage } = getPagination(searchParams);
    const whereClause = buildFilters(searchParams);
    const db = await createDb();
    const totalResult = await db.select({ value: count() }).from(webhookLogs).where(whereClause);
    const pagination = buildPagination(Number(totalResult[0]?.value ?? 0), pageSize, requestedPage);

    const logs =
      pagination.total === 0
        ? []
        : await db
            .select({
              id: webhookLogs.id,
              webhookId: webhookLogs.webhookId,
              url: webhookLogs.url,
              event: webhookLogs.event,
              status: webhookLogs.status,
              errorMessage: webhookLogs.errorMessage,
              attempts: webhookLogs.attempts,
              createdAt: webhookLogs.createdAt,
            })
            .from(webhookLogs)
            .where(whereClause)
            .orderBy(desc(webhookLogs.createdAt))
            .limit(pageSize)
            .offset(pagination.offset);

    return NextResponse.json({ logs, pagination });
  } catch (error) {
    console.error("获取 Webhook 日志失败:", error);
    return NextResponse.json({ error: "获取 Webhook 日志失败" }, { status: 500 });
  }
}

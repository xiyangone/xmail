"use client";

import { useCallback, useState } from "react";
import { RefreshCw, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminResource } from "./use-admin-resource";
import type { Pagination, WebhookLogRecord } from "./types";
import { formatDateTime, statusBadgeVariant } from "./types";

interface WebhookLogsResponse {
  logs: WebhookLogRecord[];
  pagination: Pagination;
}

export function WebhookLogsContent() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);

  const loadWebhookLogs = useCallback(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (search.trim()) params.set("search", search.trim());
    if (status !== "all") params.set("status", status);
    return fetch(`/api/admin/operations/webhook-logs?${params.toString()}`, { cache: "no-store" });
  }, [page, search, status]);

  const { data, loading, error, reload } = useAdminResource<WebhookLogsResponse>({
    load: loadWebhookLogs,
    failureMessage: "加载 Webhook 日志失败",
  });

  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Webhook className="h-4 w-4 text-primary" />
              Webhook 日志
            </p>
            <p className="text-xs text-muted-foreground">查看 Webhook 投递结果。payload 不在后台返回。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="URL / event / error" className="rounded-xl sm:w-56" />
            <Input value={status} onChange={(event) => { setPage(1); setStatus(event.target.value || "all"); }} placeholder="status or all" className="rounded-xl sm:w-36" />
            <Button variant="outline" size="sm" onClick={() => void reload()} className="rounded-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel overflow-hidden rounded-3xl p-5">
        {loading ? <Skeleton className="h-96 rounded-2xl" /> : error ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
        ) : !data?.logs.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">暂无 Webhook 日志。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Attempts</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><Badge variant={statusBadgeVariant(log.status)}>{log.status}</Badge></TableCell>
                  <TableCell>{log.event}</TableCell>
                  <TableCell className="max-w-[300px] truncate">{log.url}</TableCell>
                  <TableCell>{log.attempts}</TableCell>
                  <TableCell>{formatDateTime(log.createdAt)}</TableCell>
                  <TableCell className="max-w-[260px] truncate text-muted-foreground">{log.errorMessage ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pagination ? (
        <div className="surface-toolbar flex items-center justify-end gap-3 rounded-2xl p-3 text-sm text-muted-foreground">
          <span>{pagination.page} / {pagination.totalPages} · {pagination.total} records</span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>上一页</Button>
          <Button variant="outline" size="sm" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)}>下一页</Button>
        </div>
      ) : null}
    </div>
  );
}

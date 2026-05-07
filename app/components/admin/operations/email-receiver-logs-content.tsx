"use client";

import { useCallback, useEffect, useState } from "react";
import { Mail, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { EmailReceiverLogRecord, Pagination } from "./types";
import { formatDateTime, statusBadgeVariant } from "./types";

interface EmailReceiverLogsResponse {
  logs: EmailReceiverLogRecord[];
  pagination: Pagination;
}

async function readJsonError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export function EmailReceiverLogsContent() {
  const [data, setData] = useState<EmailReceiverLogsResponse | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search.trim()) params.set("search", search.trim());
      if (status !== "all") params.set("status", status);
      const response = await fetch(`/api/admin/operations/email-receiver-logs?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readJsonError(response));
      setData((await response.json()) as EmailReceiverLogsResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载邮件接收日志失败");
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const pagination = data?.pagination;

  return (
    <div className="space-y-5">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              邮件接收日志
            </p>
            <p className="text-xs text-muted-foreground">只展示诊断字段，不展示邮件正文。</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value); }} placeholder="recipient / sender / subject" className="rounded-xl sm:w-60" />
            <Input value={status} onChange={(event) => { setPage(1); setStatus(event.target.value || "all"); }} placeholder="status or all" className="rounded-xl sm:w-36" />
            <Button variant="outline" size="sm" onClick={() => void loadData()} className="rounded-full">
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
          <p className="py-10 text-center text-sm text-muted-foreground">暂无邮件接收日志。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell><Badge variant={statusBadgeVariant(log.status)}>{log.status}</Badge></TableCell>
                  <TableCell>{log.recipient}</TableCell>
                  <TableCell className="max-w-[220px] truncate">{log.sender ?? "-"}</TableCell>
                  <TableCell className="max-w-[260px] truncate">{log.subject ?? "-"}</TableCell>
                  <TableCell>{log.hasWebhook ? log.webhookStatus ?? "enabled" : "-"}</TableCell>
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

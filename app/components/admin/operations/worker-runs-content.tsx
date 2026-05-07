"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, ServerCog } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Pagination, WorkerRunRecord } from "./types";
import { formatDateTime, formatJsonSummary, statusBadgeVariant } from "./types";

interface WorkerRunsResponse {
  runs: WorkerRunRecord[];
  pagination: Pagination;
}

interface WorkerRunsContentProps {
  endpoint?: string;
  title?: string;
  description?: string;
  showWorkerFilter?: boolean;
}

async function readJsonError(response: Response) {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

export function WorkerRunsContent({
  endpoint = "/api/admin/operations/workers",
  title = "Worker 运行历史",
  description = "查看最近的 Worker 定时任务和手动任务执行结果。",
  showWorkerFilter = true,
}: WorkerRunsContentProps) {
  const [data, setData] = useState<WorkerRunsResponse | null>(null);
  const [workerName, setWorkerName] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (showWorkerFilter && workerName.trim()) params.set("workerName", workerName.trim());
      if (status !== "all") params.set("status", status);
      const response = await fetch(`${endpoint}?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) throw new Error(await readJsonError(response));
      setData((await response.json()) as WorkerRunsResponse);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载 Worker 运行历史失败");
    } finally {
      setLoading(false);
    }
  }, [endpoint, page, showWorkerFilter, status, workerName]);

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
              <ServerCog className="h-4 w-4 text-primary" />
              {title}
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {showWorkerFilter ? (
              <Input
                value={workerName}
                onChange={(event) => {
                  setPage(1);
                  setWorkerName(event.target.value);
                }}
                placeholder="worker name"
                className="rounded-xl sm:w-44"
              />
            ) : null}
            <Input
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value || "all");
              }}
              placeholder="status or all"
              className="rounded-xl sm:w-36"
            />
            <Button variant="outline" size="sm" onClick={() => void loadData()} className="rounded-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              刷新
            </Button>
          </div>
        </div>
      </div>

      <div className="surface-panel overflow-hidden rounded-3xl p-5">
        {loading ? (
          <Skeleton className="h-96 rounded-2xl" />
        ) : error ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{error}</p>
        ) : !data?.runs.length ? (
          <p className="py-10 text-center text-sm text-muted-foreground">暂无运行记录。</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Worker</TableHead>
                <TableHead>Run Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Counts</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell className="font-medium">{run.workerName}</TableCell>
                  <TableCell>{run.runType}</TableCell>
                  <TableCell>
                    <Badge variant={statusBadgeVariant(run.status)}>{run.status}</Badge>
                  </TableCell>
                  <TableCell>{run.trigger}</TableCell>
                  <TableCell>{formatDateTime(run.startedAt)}</TableCell>
                  <TableCell>{run.durationMs ?? "-"} ms</TableCell>
                  <TableCell className="max-w-[240px] truncate text-muted-foreground">{formatJsonSummary(run.counts)}</TableCell>
                  <TableCell className="max-w-[220px] truncate text-muted-foreground">{run.errorMessage ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {pagination ? (
        <div className="surface-toolbar flex items-center justify-end gap-3 rounded-2xl p-3 text-sm text-muted-foreground">
          <span>
            {pagination.page} / {pagination.totalPages} · {pagination.total} records
          </span>
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
            上一页
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            下一页
          </Button>
        </div>
      ) : null}
    </div>
  );
}

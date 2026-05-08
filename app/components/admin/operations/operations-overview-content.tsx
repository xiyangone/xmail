"use client";

import { useCallback } from "react";
import { Activity, AlertTriangle, Mail, RefreshCw, ScrollText, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminResource } from "./use-admin-resource";
import type { WorkerRunRecord } from "./types";
import { formatDateTime, formatJsonSummary, statusBadgeVariant } from "./types";

interface SummaryResponse {
  health: {
    workerFailures: number;
    webhookFailures: number;
    emailReceiverFailures: number;
    auditEvents: number;
  };
  recentWorkerRuns: WorkerRunRecord[];
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-3xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-3xl" />
    </div>
  );
}

export function OperationsOverviewContent() {
  const loadSummary = useCallback(
    () => fetch("/api/admin/operations/summary", { cache: "no-store" }),
    []
  );

  const { data, loading, error, reload } = useAdminResource<SummaryResponse>({
    load: loadSummary,
    failureMessage: "加载运维概览失败",
  });

  if (loading) return <OverviewSkeleton />;

  if (!data) {
    return (
      <div className="surface-panel rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{error ?? "无法加载运维概览"}</p>
        <Button variant="outline" onClick={() => void reload()} className="mt-4 rounded-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </div>
    );
  }

  const cards = [
    { label: "Worker failures", value: data.health.workerFailures, icon: Activity },
    { label: "Webhook failures", value: data.health.webhookFailures, icon: Webhook },
    { label: "Mail failures", value: data.health.emailReceiverFailures, icon: Mail },
    { label: "Audit events", value: data.health.auditEvents, icon: ScrollText },
  ];

  return (
    <div className="space-y-5">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <AlertTriangle className="h-4 w-4 text-primary" />
              运维健康摘要
            </p>
            <p className="text-xs text-muted-foreground">汇总 Worker、Webhook、邮件接收和审计数据。</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void reload()} className="rounded-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="surface-panel rounded-3xl p-5">
              <div className="mb-4 flex items-center justify-between">
                <Icon className="h-5 w-5 text-primary" />
                <Badge variant={card.value > 0 ? "outline" : "default"}>{card.value > 0 ? "attention" : "ok"}</Badge>
              </div>
              <div className="text-2xl font-semibold text-foreground">{card.value}</div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </div>
          );
        })}
      </div>

      <div className="surface-panel overflow-hidden rounded-3xl p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">最近 Worker 运行</h3>
          <Badge variant="secondary">{data.recentWorkerRuns.length} runs</Badge>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Counts</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.recentWorkerRuns.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-medium">{run.workerName}</TableCell>
                <TableCell>
                  <Badge variant={statusBadgeVariant(run.status)}>{run.status}</Badge>
                </TableCell>
                <TableCell>{formatDateTime(run.startedAt)}</TableCell>
                <TableCell>{run.durationMs ?? "-"} ms</TableCell>
                <TableCell className="max-w-[280px] truncate text-muted-foreground">{formatJsonSummary(run.counts)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

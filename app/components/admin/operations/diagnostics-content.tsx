"use client";

import { useCallback } from "react";
import { CheckCircle2, RefreshCw, Stethoscope, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminResource } from "./use-admin-resource";
import type { DiagnosticCheck } from "./types";

interface DiagnosticsResponse {
  checks: DiagnosticCheck[];
  generatedAt: string;
}

function statusVariant(status: DiagnosticCheck["status"]) {
  return status === "ok" ? "default" : "outline";
}

export function DiagnosticsContent() {
  const loadDiagnostics = useCallback(
    () => fetch("/api/admin/operations/diagnostics", { cache: "no-store" }),
    []
  );

  const { data, loading, error, reload } = useAdminResource<DiagnosticsResponse>({
    load: loadDiagnostics,
    failureMessage: "配置诊断失败",
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 rounded-3xl" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="surface-panel rounded-3xl p-8 text-center">
        <p className="text-sm text-muted-foreground">{error ?? "无法加载配置诊断"}</p>
        <Button variant="outline" onClick={() => void reload()} className="mt-4 rounded-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          重试
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="surface-toolbar rounded-2xl p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Stethoscope className="h-4 w-4 text-primary" />
              配置诊断
            </p>
            <p className="text-xs text-muted-foreground">只展示配置状态，不显示密钥原文。生成时间：{data.generatedAt}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void reload()} className="rounded-full">
            <RefreshCw className="mr-2 h-4 w-4" />
            刷新
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {data.checks.map((check) => {
          const Icon = check.status === "ok" ? CheckCircle2 : XCircle;
          return (
            <div key={check.key} className="surface-panel rounded-3xl p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-semibold text-foreground">{check.label}</div>
                    <div className="text-xs text-muted-foreground">{check.key}</div>
                  </div>
                </div>
                <Badge variant={statusVariant(check.status)}>{check.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{check.message}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";

type CleanupRun = {
  id: string;
  workerName: string;
  runType: string;
  trigger: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  counts: string | null;
  errorMessage: string | null;
};

function CleanupRunsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="surface-panel rounded-2xl p-4">
          <Skeleton className="h-5 w-48 rounded-lg" />
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <Skeleton className="h-4 rounded-lg" />
            <Skeleton className="h-4 rounded-lg" />
            <Skeleton className="h-4 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export function CleanupRunsContent() {
  const [runs, setRuns] = useState<CleanupRun[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const ta = useTranslations("admin");
  const tc = useTranslations("common");

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/operations/cleanup-runs");
      const data = (await response.json()) as { runs?: CleanupRun[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || tc("networkError"));
      }

      setRuns(data.runs ?? []);
    } catch (error) {
      toast({
        title: tc("error"),
        description: error instanceof Error ? error.message : tc("pleaseRetryLater"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [tc, toast]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  if (loading) {
    return <CleanupRunsSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="surface-toolbar flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{ta("cleanupRuns")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{ta("cleanupRunsDesc")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchRuns} className="rounded-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          {tc("refresh")}
        </Button>
      </div>

      {runs.length === 0 ? (
        <div className="theme-surface-empty-state rounded-2xl px-4 py-8 text-center text-sm text-muted-foreground">
          {tc("noData")}
        </div>
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <div key={run.id} className="theme-surface-inline-panel rounded-2xl border p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{run.runType}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{run.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(run.startedAt)}
                  </div>
                </div>
                <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2 md:min-w-80">
                  <span>worker: {run.workerName}</span>
                  <span>trigger: {run.trigger}</span>
                  <span>duration: {run.durationMs ?? 0}ms</span>
                  <span>finished: {run.finishedAt ? formatDate(run.finishedAt) : "-"}</span>
                </div>
              </div>
              {run.counts ? <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/40 p-3 text-xs">{run.counts}</pre> : null}
              {run.errorMessage ? <p className="mt-3 text-sm text-destructive">{run.errorMessage}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

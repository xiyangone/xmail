"use client";

import { WorkerRunsContent } from "./worker-runs-content";

export function CleanupRunsContent() {
  return (
    <WorkerRunsContent
      endpoint="/api/admin/operations/cleanup-runs"
      title="清理任务历史"
      description="查看过期邮箱清理和临时账号清理的运行结果。"
      showWorkerFilter={false}
    />
  );
}

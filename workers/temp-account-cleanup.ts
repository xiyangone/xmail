/**
 * Cloudflare Worker for cleaning up expired temporary accounts
 * This worker runs on a schedule to automatically clean up expired temporary accounts
 */

interface Env {
  SITE_URL: string;
  INTERNAL_WORKER_SECRET?: string;
}

interface CleanupResult {
  success: boolean;
  counts?: {
    cleanedUsedCardKeys?: number;
    cleanedUnusedCardKeys?: number;
    cleanedEmails?: number;
  };
  durationMs?: number;
  runId?: string | null;
  cleanedCount?: number;
  error?: string;
}

function buildInternalHeaders(env: Env) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.INTERNAL_WORKER_SECRET) {
    headers["X-Internal-Worker-Secret"] = env.INTERNAL_WORKER_SECRET;
  }

  return headers;
}

async function runCleanup(env: Env): Promise<{ result: CleanupResult; status: number }> {
  const response = await fetch(`${env.SITE_URL}/api/cleanup/temp-accounts`, {
    method: "POST",
    headers: buildInternalHeaders(env),
  });

  const result = (await response.json()) as CleanupResult;

  if (!response.ok) {
    throw new Error(result.error ?? `清理请求失败: ${response.status} ${response.statusText}`);
  }

  return { result, status: response.status };
}

const tempAccountCleanupWorker = {
  async scheduled(
    controller: ScheduledController,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    void controller;
    void ctx;
    console.log("开始清理过期临时账号...");

    try {
      const { result } = await runCleanup(env);
      console.log("清理结果:", result);

      if (result.success) {
        console.log(`成功清理临时账号任务，runId=${result.runId ?? "none"}`);
      } else {
        console.error("清理失败:", result.error);
      }
    } catch (error) {
      console.error("清理过期临时账号时发生错误:", error);
      throw error;
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    // 支持手动触发清理
    if (request.method === "POST") {
      try {
        const { result, status } = await runCleanup(env);
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
          status,
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : "清理失败",
          }),
          {
            headers: { "Content-Type": "application/json" },
            status: 500,
          }
        );
      }
    }

    return new Response("Temporary Account Cleanup Worker", {
      headers: { "Content-Type": "text/plain" },
    });
  },
};

export default tempAccountCleanupWorker;

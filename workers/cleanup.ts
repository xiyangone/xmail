interface Env {
  DB: D1Database
  SITE_CONFIG: KVNamespace
}

const BATCH_SIZE = 100
const WORKER_NAME = 'cleanup'

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

async function recordWorkerRun(
  env: Env,
  input: {
    runType: string
    trigger: string
    status: string
    startedAt: Date
    finishedAt: Date
    counts?: unknown
    errorMessage?: string | null
  }
) {
  await env.DB
    .prepare(`
      INSERT INTO worker_run (
        id,
        worker_name,
        run_type,
        trigger,
        status,
        started_at,
        finished_at,
        duration_ms,
        counts,
        error_message,
        metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      crypto.randomUUID(),
      WORKER_NAME,
      input.runType,
      input.trigger,
      input.status,
      input.startedAt.getTime(),
      input.finishedAt.getTime(),
      Math.max(0, input.finishedAt.getTime() - input.startedAt.getTime()),
      input.counts ? JSON.stringify(input.counts) : null,
      input.errorMessage ?? null,
      null
    )
    .run()
}

const main = {
  async scheduled(_: ScheduledEvent, env: Env) {
    const now = Date.now()
    const startedAt = new Date()
    let status = 'success'
    let counts: Record<string, unknown> | undefined
    let failure: string | null = null

    try {
      // 读取清理配置
      const deleteExpiredEmails = await env.SITE_CONFIG.get("CLEANUP_DELETE_EXPIRED_EMAILS")
      
      if (deleteExpiredEmails === "false") {
        console.log('Expired email deletion is disabled')
        status = 'skipped'
        counts = { skipped: true, reason: 'disabled' }
        return
      }

      const result = await env.DB
        .prepare(`
          DELETE FROM email 
          WHERE expires_at < ?
          LIMIT ?
        `)
        .bind(now, BATCH_SIZE)
        .run()

      if (result.success) {
        const deletedEmails = result?.meta?.changes ?? 0
        counts = { deletedEmails }
        console.log(`Deleted ${deletedEmails} expired emails and their associated messages`)
      } else {
        failure = 'Failed to delete expired emails'
        status = 'failed'
        console.error(failure)
        throw new Error(failure)
      }
    } catch (error) {
      status = 'failed'
      failure = toErrorMessage(error)
      console.error('Failed to cleanup:', error)
      throw error
    } finally {
      try {
        await recordWorkerRun(env, {
          runType: 'expired-email-cleanup',
          trigger: 'scheduled',
          status,
          startedAt,
          finishedAt: new Date(),
          counts,
          errorMessage: failure,
        })
      } catch (logError) {
        console.error('Failed to record cleanup worker run:', logError)
      }
    }
  }
}

export default main

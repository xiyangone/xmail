interface Env {
  DB: D1Database
  SITE_CONFIG: KVNamespace
}

const BATCH_SIZE = 100

const main = {
  async scheduled(_: ScheduledEvent, env: Env) {
    const now = Date.now()

    try {
      // 读取清理配置
      const deleteExpiredEmails = await env.SITE_CONFIG.get("CLEANUP_DELETE_EXPIRED_EMAILS")
      
      if (deleteExpiredEmails === "false") {
        console.log('Expired email deletion is disabled')
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
        console.log(`Deleted ${result?.meta?.changes ?? 0} expired emails and their associated messages`)
      } else {
        console.error('Failed to delete expired emails')
      }
    } catch (error) {
      console.error('Failed to cleanup:', error)
      throw error
    }
  }
}

export default main

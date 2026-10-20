import { buildApp } from './app.js'
import { loadDotEnv, parseEnv } from './config/env.js'
import { createPool } from './db/pool.js'

async function main(): Promise<void> {
  loadDotEnv()
  const env = parseEnv()
  const pool = createPool(env.DATABASE_URL, env.DATABASE_POOL_MAX)
  const app = await buildApp({ env, pool })

  // Erros de conexões ociosas do pool não devem derrubar o processo.
  pool.on('error', (error) => app.log.error({ err: error }, 'idle database client error'))

  let shuttingDown = false
  const shutdown = async (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true
    app.log.info({ signal }, 'shutting down')
    try {
      await app.close()
      await pool.end()
      process.exit(0)
    } catch (error) {
      app.log.error({ err: error }, 'error during shutdown')
      process.exit(1)
    }
  }
  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  await app.listen({ host: env.HOST, port: env.PORT })
}

main().catch((error: unknown) => {
  // O logger pode não existir se a configuração falhou.
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})

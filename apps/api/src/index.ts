/**
 * Server entrypoint — `node dist/index.js` in the prod image.
 *
 * Two responsibilities, both driven by the container contract in
 * infra/README.md: bind 0.0.0.0:3000 so the service is reachable from the host
 * and from nginx, and shut down cleanly on SIGTERM (compose prod sets
 * `restart: unless-stopped` and `init: true`, so a rolling update sends SIGTERM
 * and waits `stop_grace_period: 30s`).
 *
 * Migrations are NOT run here on purpose — see infra/README.md. Use
 * `docker compose ... run --rm api npm run migrate`.
 */
import { buildApp } from './app.js'
import { config } from './config.js'
import { closePool, ping } from './db/pool.js'

/**
 * A failing `listen` must exit non-zero. Left unhandled it would surface as an
 * unhandled rejection with a nonzero exit anyway, but not before the message is
 * clear about which address failed.
 */
async function main(): Promise<void> {
  const app = await buildApp()

  // Reported for observability only. Never fatal: see the /health note in
  // routes/health.ts.
  void ping().then((reachable) => {
    if (config.databaseUrl) {
      app.log.info({ reachable }, `postgres ${reachable ? 'reachable' : 'NOT reachable'}`)
    } else {
      app.log.warn('DATABASE_URL is not set — serving in-memory data only')
    }
  })

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info({ signal }, 'shutting down')
    try {
      // Stops accepting connections and drains in-flight requests.
      await app.close()
      await closePool()
      process.exit(0)
    } catch (error) {
      app.log.error({ err: error }, 'shutdown failed')
      process.exit(1)
    }
  }

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM')
  })
  process.on('SIGINT', () => {
    void shutdown('SIGINT')
  })

  // Last-resort handlers: log and let the process die. Without these, an
  // unhandled rejection would be an opaque exit with no reason.
  process.on('unhandledRejection', (reason) => {
    app.log.error({ reason }, 'unhandled rejection')
  })
  process.on('uncaughtException', (error) => {
    app.log.fatal({ err: error }, 'uncaught exception')
    void shutdown('uncaughtException')
  })

  await app.listen({ host: config.host, port: config.port })
  app.log.info(
    { host: config.host, port: config.port, env: config.env },
    'idea-flow api listening',
  )
}

await main()
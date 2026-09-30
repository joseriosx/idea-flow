/**
 * Postgres access.
 *
 * The pool is created lazily and is never created as an import side effect:
 * `GET /health` has to answer even when Postgres is unreachable, so nothing may
 * open a socket before a request that actually needs one arrives.
 */
import pg from 'pg'
import { config } from '../config.js'

const { Pool } = pg

let pool: pg.Pool | undefined

/**
 * Returns the shared pool, or `null` when no `DATABASE_URL` is configured.
 * Callers treat `null` as "this feature needs a database that was never
 * pointed at" and answer with a clear error instead of throwing at boot.
 */
export function getPool(): pg.Pool | null {
  if (!config.databaseUrl) return null
  if (pool) return pool

  pool = new Pool({
    connectionString: config.databaseUrl,
    connectionTimeoutMillis: config.databaseConnectTimeoutMs,
    // A container pool that outlives its database would keep serving dead
    // sockets; a short idle window makes the next request reconnect cleanly.
    idleTimeoutMillis: 30_000,
    max: 10,
  })

  // An idle client can drop with no in-flight query to reject, which would be an
  // unhandled 'error' event and take the whole process down. Log and let the
  // pool replace it.
  pool.on('error', (error) => {
    console.error('[db] idle client error:', error.message)
  })

  return pool
}

/** True when a database was configured. Says nothing about reachability. */
export function isDatabaseConfigured(): boolean {
  return config.databaseUrl !== ''
}

/**
 * Round-trips a trivial query. Used by the readiness detail only — never by
 * `/health` itself, which must stay fast and must not fail on a dead database.
 */
export async function ping(): Promise<boolean> {
  const active = getPool()
  if (!active) return false
  try {
    await active.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

/** Closes the pool on shutdown so the process can exit promptly. */
export async function closePool(): Promise<void> {
  if (!pool) return
  const closing = pool
  pool = undefined
  await closing.end().catch(() => {
    /* already closed or broken: nothing left to release */
  })
}
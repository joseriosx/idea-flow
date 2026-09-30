/**
 * Runtime configuration, read once from the environment.
 *
 * Everything here has a working default so the process boots in a bare
 * container, but the two values compose always sets (HOST, PORT, DATABASE_URL)
 * are the ones that matter. Nothing in this module touches the network or the
 * database: importing it must stay free of side effects, because `/health`
 * depends on being answerable before Postgres is reachable.
 */

function str(name: string, fallback: string): string {
  const raw = process.env[name]
  return raw === undefined || raw.trim() === '' ? fallback : raw.trim()
}

function int(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const parsed = Number.parseInt(raw.trim(), 10)
  if (!Number.isFinite(parsed)) {
    throw new Error(`${name} must be an integer, got ${JSON.stringify(raw)}`)
  }
  return parsed
}

/**
 * Containers must bind 0.0.0.0 — 127.0.0.1 inside a container is unreachable
 * from the host and from the other services, which is the single most common
 * reason a compose stack starts but "cannot be reached".
 */
const host = str('HOST', '0.0.0.0')
const port = int('PORT', 3000)

/**
 * CORS is only exercised in dev, where the browser talks to the api directly.
 * Prod is same-origin behind nginx, and a wrong value there would block nothing
 * real, so an unset CORS_ORIGIN disables the headers instead of guessing.
 */
const corsOrigin = process.env['CORS_ORIGIN']?.trim() ?? ''

const databaseUrl = process.env['DATABASE_URL']?.trim() ?? ''

export const config = {
  env: str('NODE_ENV', 'development'),
  host,
  port,
  /** Empty string means "no cross-origin requests allowed", which is correct for prod. */
  corsOrigin,
  corsEnabled: corsOrigin !== '',
  /**
   * A missing DATABASE_URL is tolerated at boot on purpose: the health probe is
   * the readiness signal for the whole stack, so it must answer even while the
   * database is unreachable. Routes that actually need Postgres fail loudly
   * instead, at request time.
   */
  databaseUrl,
  /** Postgres connection timeout, short enough that a dead host fails fast. */
  databaseConnectTimeoutMs: int('DATABASE_CONNECT_TIMEOUT_MS', 5_000),
  logLevel: str('LOG_LEVEL', ''),
} as const

export type Config = typeof config
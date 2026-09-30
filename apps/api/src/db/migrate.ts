/**
 * Minimal, forward-only SQL migration runner.
 *
 * Deliberately hand-rolled: the whole surface is "run every unapplied .sql file
 * in migrations/, in filename order, each in its own transaction, inside a
 * Postgres advisory lock". That lock is the part that matters — infra/README.md
 * forbids running migrations from the api entrypoint, but `docker compose run
 * --rm api npm run migrate` can still overlap with a second invocation, and two
 * concurrent runners applying the same DDL is a race.
 *
 * Rules this runner enforces:
 *   - applied files are recorded by name, so a file is never applied twice
 *   - one transaction per file: a failure rolls that file back entirely
 *   - a checksum mismatch on an already-applied file is an error, not a warning
 *     (it means a released migration was edited after the fact)
 */
import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
import { getPool } from './pool.js'

/** Arbitrary but fixed: any process holding it is running migrations. */
const ADVISORY_LOCK_ID = 4_120_907_311

const MIGRATIONS_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../migrations')

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name        text        PRIMARY KEY,
    checksum    text        NOT NULL,
    applied_at  timestamptz NOT NULL DEFAULT now()
  )
`

type MigrationFile = { name: string; sql: string; checksum: string }

function checksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex').slice(0, 32)
}

/** Reads migrations/*.sql, sorted, skipping anything that is not a plain file. */
async function loadMigrations(dir: string): Promise<MigrationFile[]> {
  let entries: string[]
  try {
    entries = await readdir(dir)
  } catch {
    // No migrations directory is a valid, empty state.
    return []
  }

  const files = entries.filter((name) => name.endsWith('.sql')).sort((a, b) => a.localeCompare(b, 'en'))
  const migrations: MigrationFile[] = []
  for (const name of files) {
    const sql = await readFile(join(dir, name), 'utf8')
    migrations.push({ name, sql, checksum: checksum(sql) })
  }
  return migrations
}

/**
 * Applies pending migrations.
 *
 * `runMigrations` is exported so tests can drive it against a pool; the CLI
 * wrapper below is what `npm run migrate` calls.
 */
export async function runMigrations(pool: pg.Pool): Promise<string[]> {
  const migrations = await loadMigrations(MIGRATIONS_DIR)
  const client = await pool.connect()
  const applied: string[] = []

  try {
    // Released at the end of the block whatever happens.
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_ID])
    await client.query(CREATE_TABLE)

    const existing = await client.query<{ name: string; checksum: string }>(
      'SELECT name, checksum FROM schema_migrations',
    )
    const known = new Map(existing.rows.map((row) => [row.name, row.checksum]))

    for (const migration of migrations) {
      const previous = known.get(migration.name)
      if (previous !== undefined) {
        if (previous !== migration.checksum) {
          throw new Error(
            `migration ${migration.name} changed after it was applied ` +
              `(recorded ${previous}, file is now ${migration.checksum}) — ` +
              'add a new migration instead of editing a released one',
          )
        }
        continue
      }

      // DDL and its bookkeeping row commit together: a file can never be marked
      // applied without its statements having landed.
      await client.query('BEGIN')
      try {
        await client.query(migration.sql)
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
          migration.name,
          migration.checksum,
        ])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw new Error(`migration ${migration.name} failed: ${(error as Error).message}`)
      }

      applied.push(migration.name)
    }
  } finally {
    await client
      .query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_ID])
      .catch(() => {
        /* connection already gone; the lock dies with the session */
      })
    client.release()
  }

  return applied
}

/** `npm run migrate` — one-off, never the container entrypoint. */
async function main(): Promise<void> {
  const pool = getPool()
  if (!pool) {
    console.error('DATABASE_URL is not set — nothing to migrate.')
    process.exitCode = 1
    return
  }

  try {
    const applied = await runMigrations(pool)
    if (applied.length === 0) {
      console.log('migrations: already up to date')
    } else {
      console.log(`migrations: applied ${applied.join(', ')}`)
    }
  } catch (error) {
    console.error(`migrations failed: ${(error as Error).message}`)
    process.exitCode = 1
  } finally {
    await pool.end().catch(() => {})
  }
}

// Only run when executed directly, never when imported by a test.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
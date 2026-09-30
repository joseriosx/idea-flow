/**
 * Build metadata, read from package.json at runtime.
 *
 * `process.env.npm_package_version` is only set when node is launched through an
 * `npm run` script, and the prod entrypoint is a bare `node dist/index.js` — so
 * relying on it reports `0.0.0` in production, which is exactly where the
 * version matters most (log lines, health payload, correlating a rollback).
 *
 * Resolution is relative to this module, so it works from both `src/` (tsx, in
 * dev) and `dist/` (compiled, in prod) — in both cases two levels up is the app
 * root holding package.json.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

function readVersion(): string {
  // Unknown rather than a fake version: a wrong number is worse than none.
  const fallback = 'unknown'
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    const raw = readFileSync(resolve(here, '../../package.json'), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      const version = (parsed as { version?: unknown }).version
      if (typeof version === 'string' && version !== '') return version
    }
    return fallback
  } catch {
    return fallback
  }
}

export const version = readVersion()
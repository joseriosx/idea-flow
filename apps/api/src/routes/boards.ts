/**
 * Board routes — the minimum read-only board surface.
 *
 * Scope is deliberately tiny: list boards and fetch one by id. The demo board is
 * served from memory so the endpoint works before any migration has run; a
 * stored board is read from Postgres when a database is configured and the table
 * exists, and any failure there degrades to the demo board rather than a 500.
 *
 * Nothing writes. Persistence beyond the seeded demo graph is not in scope yet,
 * so there is no create/update/delete route to get wrong.
 */
import type { FastifyPluginAsync } from 'fastify'
import { DEMO_GRAPH_ID, demoGraph } from '../lib/demo-graph.js'
import { getPool, isDatabaseConfigured } from '../db/pool.js'

type BoardRow = {
  id: string
  name: string
  description: string | null
  updated_at: Date
}

const FALLBACK_BOARD = {
  id: DEMO_GRAPH_ID,
  name: 'Demo board',
  description: 'Seeded graph shipped with the api.',
  updated_at: null,
} as const

function summarise(row: typeof FALLBACK_BOARD | BoardRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : null,
  }
}

/**
 * Reads stored boards. Returns an empty list when the database is not
 * configured or the table does not exist yet — an unmigrated database is a
 * normal state, not an error to surface to a read-only endpoint.
 */
async function loadBoards(): Promise<BoardRow[]> {
  const pool = getPool()
  if (!pool) return []

  try {
    const result = await pool.query<BoardRow>(
      'SELECT id, name, description, updated_at FROM boards ORDER BY updated_at DESC LIMIT 50',
    )
    return result.rows
  } catch (error) {
    console.warn('[boards] falling back to the seeded board:', (error as Error).message)
    return []
  }
}

export const boardRoutes: FastifyPluginAsync = async (fastify) => {
  const listBoards = async () => {
    const rows = await loadBoards()
    // Never return an empty list: an empty board rail is a dead end for the UI,
    // and the demo board is always a truthful answer.
    const boards = rows.length > 0 ? rows.map(summarise) : [FALLBACK_BOARD]
    return { boards, database: isDatabaseConfigured() ? 'configured' : 'unconfigured' }
  }

  const getBoard = async (request: { params: unknown }, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) => {
    const { id } = request.params as { id?: string }
    if (!id || id !== DEMO_GRAPH_ID) {
      return reply.code(404).send({ error: 'not_found', message: `no board with id ${String(id)}` })
    }
    return reply.code(200).send({ board: summarise(FALLBACK_BOARD), graph: demoGraph() })
  }

  fastify.get('/boards', listBoards)
  fastify.get('/api/boards', listBoards)

  fastify.get('/boards/:id', getBoard)
  fastify.get('/api/boards/:id', getBoard)
}
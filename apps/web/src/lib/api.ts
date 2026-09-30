import { isLinkKind, isNodeKind, NODE_TYPE, EDGE_TYPE } from '../types'
import type { IdeaNode, LinkKind, RelationEdge } from '../types'

/* ==========================================================================
   Optional api client.

   The canvas is useful on its own, so nothing here is ever allowed to take the
   app down: every failure resolves to a status the HUD can show, and the
   seeded graph stays on screen either way.

   `VITE_*` is inlined at BUILD time (infra/README.md), so prod receives it as a
   build arg and the default lives in code rather than in an env file. See the
   note on DEV_DEFAULT below.
   ========================================================================== */

/**
 * `VITE_*` is inlined at BUILD time, so an unset variable cannot be fixed at
 * runtime — and there is no runtime step in this stack. Hence the two defaults:
 *
 * - dev:  the api's published dev port. The dev overlay does not pass
 *         `VITE_API_URL` into this container and Vite only reads env files that
 *         live in this directory, so without a default the api would look
 *         unconfigured even though `docker compose ... up` publishes it.
 * - prod: the same-origin `/api` that nginx proxies, i.e. no CORS.
 *
 * Setting `VITE_API_URL=` (empty) is the way to say "no api": the board is
 * fully usable on its own, so that is a supported configuration and not an
 * error state.
 */
const DEV_DEFAULT = 'http://localhost:3000'
const PROD_DEFAULT = '/api'

const RAW = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? DEV_DEFAULT : PROD_DEFAULT)
).trim()

/** '' means "no api configured" — the app stays purely local. */
export const API_BASE = RAW === '/' ? '' : RAW.replace(/\/+$/, '')

export const API_CONFIGURED = API_BASE !== ''

/**
 * The board the app opens on. It is also the only board the api ships today,
 * and the id the on-device seed is addressed by — so the local fallback and the
 * api-backed one are the same board, reached two different ways.
 */
export const DEFAULT_BOARD_ID = 'demo'

/**
 * An explicit `VITE_GRAPH_PATH` wins for every board, because an api that
 * publishes one fixed path has no per-board addressing to offer. Left unset,
 * boards are addressed individually, which is what the library needs.
 */
const GRAPH_PATH = (import.meta.env.VITE_GRAPH_PATH ?? '').replace(/^\/+/, '')

function graphUrl(boardId: string): string {
  if (!API_CONFIGURED) return ''
  return GRAPH_PATH
    ? `${API_BASE}/${GRAPH_PATH}`
    : `${API_BASE}/graphs/${encodeURIComponent(boardId)}`
}

export const GRAPH_URL = graphUrl(DEFAULT_BOARD_ID)
export const HEALTH_URL = API_CONFIGURED ? `${API_BASE}/health` : ''

const TIMEOUT_MS = 6000

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: 'application/json' },
    })
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText || 'request failed'}`)
    }
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

/* ==========================================================================
   Health
   ========================================================================== */

export type HealthResult = { ok: true; detail: string } | { ok: false; detail: string }

export async function checkHealth(): Promise<HealthResult> {
  if (!API_CONFIGURED) {
    return { ok: false, detail: 'no api configured' }
  }
  try {
    const body = await getJson(HEALTH_URL)
    const detail =
      typeof body === 'object' && body !== null && 'status' in body
        ? String((body as { status: unknown }).status)
        : 'ok'
    return { ok: true, detail }
  } catch (error) {
    return { ok: false, detail: describe(error) }
  }
}

/* ==========================================================================
   Graph loading
   ========================================================================== */

type Bag = Record<string, unknown>

function asBag(value: unknown): Bag {
  return typeof value === 'object' && value !== null ? (value as Bag) : {}
}

function pick(bag: Bag, keys: readonly string[]): unknown {
  for (const key of keys) {
    const value = bag[key]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return undefined
}

function asText(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? fallback : String(value)
}

function asNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** The api may say `supports` / `support` / `SUPPORTED`; all mean the same. */
function asLinkKind(value: unknown): LinkKind | null {
  if (isLinkKind(value)) return value
  if (typeof value !== 'string') return null
  const key = value.toLowerCase().replace(/[\s-]+/g, '_')
  if (key.startsWith('support')) return 'supports'
  if (key.startsWith('deriv')) return 'derives'
  return null
}

function edgeKindOf(edge: Bag, fallback: LinkKind): LinkKind {
  return asLinkKind(pick(edge, ['kind', 'type', 'relation', 'label', 'verb'])) ?? fallback
}

/**
 * Accepts a graph in whatever shape the api happens to answer with, as long as
 * there is a list of nodes and a list of edges somewhere in it. Anything that
 * cannot be read becomes a sensible default rather than a blank canvas.
 */
export function normaliseGraph(raw: unknown): { nodes: IdeaNode[]; edges: RelationEdge[] } | null {
  const root = asBag(raw)
  const body = asBag(root.data ?? root.graph ?? root)
  const rawNodes = pick(body, ['nodes', 'items', 'cards'])
  const rawEdges = pick(body, ['edges', 'links', 'relations', 'connections'])
  if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) return null

  const idOf = (bag: Bag, index: number, prefix: string): string =>
    asText(pick(bag, ['id', 'key', 'slug']), `${prefix}-${index}`)

  const nodes: IdeaNode[] = rawNodes.flatMap((entry, index) => {
    const bag = asBag(entry)
    const id = idOf(bag, index, 'n')
    const data = asBag(pick(bag, ['data']) ?? bag)
    const kind = pick(data, ['kind', 'type', 'node_type']) ?? pick(bag, ['kind', 'type', 'node_type'])
    const position = asBag(pick(bag, ['position']) ?? bag)
    return [
      {
        id,
        type: NODE_TYPE,
        position: {
          x: asNumber(pick(position, ['x', 'left', 'px']), index * 380),
          y: asNumber(pick(position, ['y', 'top', 'py']), (index % 3) * 220),
        },
        data: {
          kind: isNodeKind(kind) ? kind : 'idea',
          title: asText(
            pick(data, ['title', 'label', 'name', 'text', 'headline', 'claim', 'question']),
            'untitled',
          ),
          note: asText(pick(data, ['note', 'detail', 'details', 'body', 'description', 'source', 'citation'])),
          seq: index,
        },
      },
    ]
  })

  const byId = new Set(nodes.map((n) => n.id))
  const edges: RelationEdge[] = rawEdges.flatMap((entry, index) => {
    const bag = asBag(entry)
    const source = asText(pick(bag, ['source', 'from', 'src', 'origin']))
    const target = asText(pick(bag, ['target', 'to', 'dst', 'destination']))
    // an edge that dangles would crash the canvas on layout: drop it
    if (!byId.has(source) || !byId.has(target) || source === target) return []
    return [
      {
        id: idOf(bag, index, 'e'),
        type: EDGE_TYPE,
        source,
        target,
        data: { kind: edgeKindOf(asBag(pick(bag, ['data']) ?? bag), 'supports') },
      },
    ]
  })

  return { nodes, edges }
}

export type GraphResult =
  | { ok: true; graph: { nodes: IdeaNode[]; edges: RelationEdge[] } }
  | { ok: false; detail: string }

export async function fetchGraph(boardId: string = DEFAULT_BOARD_ID): Promise<GraphResult> {
  if (!API_CONFIGURED) {
    return { ok: false, detail: 'set VITE_API_URL to enable this' }
  }
  try {
    const graph = normaliseGraph(await getJson(graphUrl(boardId)))
    if (!graph) {
      return { ok: false, detail: 'the response has no list of nodes and edges' }
    }
    return { ok: true, graph }
  } catch (error) {
    return { ok: false, detail: describe(error) }
  }
}

/* ==========================================================================
   Boards — the library

   The same tolerance as the graph: anything unreadable becomes a presentable
   default rather than an exception, and every failure is a *state* the screen
   can draw. Nothing here is allowed to be the reason there is nothing to open.
   ========================================================================== */

export type BoardSummary = {
  id: string
  name: string
  description: string
  updatedAt: string | null
}

/** Accepts `{board:{…}}`, `{…}` or a bare list entry, and both date spellings. */
function boardOf(raw: unknown, fallbackId: string): BoardSummary {
  const bag = asBag(pick(asBag(raw), ['board']) ?? raw)
  return {
    id: asText(pick(bag, ['id', 'slug', 'key']), fallbackId),
    name: asText(pick(bag, ['name', 'title', 'label']), 'Untitled board'),
    description: asText(pick(bag, ['description', 'summary', 'about'])),
    updatedAt: asText(pick(bag, ['updatedAt', 'updated_at', 'modifiedAt']), '') || null,
  }
}

export type BoardsResult =
  | { ok: true; boards: BoardSummary[] }
  | { ok: false; detail: string }

export async function fetchBoards(): Promise<BoardsResult> {
  if (!API_CONFIGURED) {
    return { ok: false, detail: 'no api configured' }
  }
  try {
    const body = await getJson(`${API_BASE}/boards`)
    // a bare array is as plausible as a wrapper, and both cost nothing to accept
    const list = Array.isArray(body) ? body : pick(asBag(body), ['boards', 'items', 'results'])
    if (!Array.isArray(list)) {
      return { ok: false, detail: 'the response has no list of boards' }
    }
    const boards = list
      .map((entry, index) => boardOf(entry, `board-${index}`))
      // a card with no id cannot be opened, so it is not a board
      .filter((board) => board.id !== '')
    return { ok: true, boards }
  } catch (error) {
    return { ok: false, detail: describe(error) }
  }
}

export type BoardResult =
  | { ok: true; board: BoardSummary; graph: { nodes: IdeaNode[]; edges: RelationEdge[] } | null }
  | { ok: false; detail: string }

/**
 * One board with its graph.
 *
 * `graph` is nullable on purpose: a board that exists but carries no graph is
 * still a board, and the caller can open it over whatever is already on the
 * canvas instead of being handed a dead end.
 */
export async function fetchBoard(id: string): Promise<BoardResult> {
  if (!API_CONFIGURED) {
    return { ok: false, detail: 'no api configured' }
  }
  try {
    const body = await getJson(`${API_BASE}/boards/${encodeURIComponent(id)}`)
    return { ok: true, board: boardOf(body, id), graph: normaliseGraph(body) }
  } catch (error) {
    return { ok: false, detail: describe(error) }
  }
}

function describe(error: unknown): string {
  if (error instanceof DOMException && error.name === 'AbortError') return 'timed out'
  if (error instanceof Error) {
    // `fetch` rejects with "Failed to fetch" when the request never lands — a
    // browser string, not a sentence to put in front of a reader. Callers show
    // this in toasts and notices, so it gets translated once, here.
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return 'the connection failed'
    }
    return error.message
  }
  return 'unknown error'
}

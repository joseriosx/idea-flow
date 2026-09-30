/**
 * Graph routes — the read-only board feed.
 *
 * Route paths: infra/README.md is explicit that nginx strips the `/api` prefix
 * in prod, so the canonical route is UNPREFIXED (`/graphs/demo`). The `/api/...`
 * alias below exists only so that hitting the api container directly — in dev,
 * or with curl against 127.0.0.1:3000 — answers on the same path the browser
 * uses. Prod never reaches it: nginx rewrites `/api/graphs/demo` to
 * `/graphs/demo` before the request gets here.
 *
 * This is a read-only surface. Nothing in this file writes, so there is no
 * mutation path to get wrong.
 */
import type { FastifyPluginAsync } from 'fastify'
import { DEMO_GRAPH_ID, demoGraph } from '../lib/demo-graph.js'

export const graphRoutes: FastifyPluginAsync = async (fastify) => {
  const serveDemo = async (_request: unknown, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) => {
    return reply.code(200).send(demoGraph())
  }

  fastify.get('/graphs/demo', serveDemo)

  // Alias: same handler, browser-visible path. See the note above.
  fastify.get('/api/graphs/demo', serveDemo)

  // Index, so a client can discover the graph id instead of hardcoding it.
  fastify.get('/graphs', async () => ({
    graphs: [{ id: DEMO_GRAPH_ID, href: `/graphs/${DEMO_GRAPH_ID}` }],
  }))
  fastify.get('/api/graphs', async () => ({
    graphs: [{ id: DEMO_GRAPH_ID, href: `/api/graphs/${DEMO_GRAPH_ID}` }],
  }))
}
/**
 * Graph routes — the read-only board feed.
 *
 * Route paths: infra/README.md is explicit that nginx strips the `/api` prefix
 * in prod, so the canonical route is UNPREFIXED (`/graphs/demo`). The API
 * serves only unprefixed routes.
 */
import type { FastifyPluginAsync } from 'fastify'
import { DEMO_GRAPH_ID, demoGraph } from '../lib/demo-graph.js'

export const graphRoutes: FastifyPluginAsync = async (fastify) => {
  const serveDemo = async (_request: unknown, reply: { code: (n: number) => { send: (b: unknown) => unknown } }) => {
    return reply.code(200).send(demoGraph())
  }

  fastify.get('/graphs/demo', serveDemo)

  // Index, so a client can discover the graph id instead of hardcoding it.
  fastify.get('/graphs', async () => ({
    graphs: [{ id: DEMO_GRAPH_ID, href: `/graphs/${DEMO_GRAPH_ID}` }],
  }))
}

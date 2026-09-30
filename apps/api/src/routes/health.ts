/**
 * Health and readiness.
 *
 * `GET /health` is the readiness signal for the entire stack: compose probes it,
 * and in prod the `web` container waits for it before starting (infra/README.md).
 * That makes two hard requirements:
 *
 *   1. it must answer 2xx without auth, always — a 500 here means the stack is
 *      never considered healthy and web never comes up;
 *   2. it must NOT depend on Postgres being reachable. The database can be slow
 *      to accept connections during a rolling restart, and a health probe that
 *      fails on that would turn a transient blip into a restart loop.
 *
 * So this handler never queries the database. It reports only what this process
 * knows for certain about itself.
 */
import type { FastifyPluginAsync } from 'fastify'
import { version } from '../lib/version.js'

export type HealthBody = {
  status: 'ok'
  service: string
  version: string
  env: string
  uptime: number
  timestamp: string
}

const SERVICE = 'idea-flow-api'

function healthBody(): HealthBody {
  return {
    status: 'ok',
    service: SERVICE,
    version,
    env: process.env['NODE_ENV'] ?? 'development',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }
}

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (_request, reply) => {
    return reply.code(200).send(healthBody())
  })

  // `/healthz` is nginx's own probe for the web container; exposing the same
  // signal here keeps a single healthcheck command working against either
  // service.
  fastify.get('/healthz', async (_request, reply) => {
    return reply.code(200).send(healthBody())
  })
}
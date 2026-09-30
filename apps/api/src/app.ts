/**
 * Fastify app factory.
 *
 * Separated from `index.ts` so tests can build the app with `app.inject()` and
 * never bind a port. `buildApp()` is also where cross-cutting concerns live —
 * CORS, error handling, logging — so every instance gets them identically.
 */
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { healthRoutes } from './routes/health.js'
import { graphRoutes } from './routes/graphs.js'
import { boardRoutes } from './routes/boards.js'

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    // Pino's default level is 'info'; in tests it would interleave noise with
    // the runner output.
    logger: config.logLevel !== '' ? { level: config.logLevel } : config.env === 'test' ? false : true,
    // Trust nothing by default. compose publishes the api on 127.0.0.1, and
    // `X-Forwarded-*` is only meaningful when a proxy actually sets it.
    trustProxy: false,
    disableRequestLogging: false,
    bodyLimit: 1_048_576,
  })

  if (config.corsEnabled) {
    await app.register(cors, {
      origin: config.corsOrigin,
      methods: ['GET', 'HEAD', 'OPTIONS'],
      // Read-only surface: no credentials, no writes.
      credentials: false,
      maxAge: 600,
    })
  }

  await app.register(healthRoutes)
  await app.register(graphRoutes)
  await app.register(boardRoutes)

  app.setNotFoundHandler((request, reply) => {
    return reply.code(404).send({
      error: 'not_found',
      message: `${request.method} ${request.url} does not exist`,
    })
  })

  app.setErrorHandler((error, request, reply) => {
    // Fastify already logs; the reply must still be JSON, and must not leak an
    // internal message or a stack trace to the browser.
    request.log.error({ err: error }, 'request failed')
    // `FastifyError` gives us `statusCode`, but the handler is also reached with
    // plain throwables, so the field is read defensively.
    const candidate = error as { statusCode?: unknown; message?: unknown }
    const statusCode =
      typeof candidate.statusCode === 'number' && candidate.statusCode >= 400 ? candidate.statusCode : 500
    const message = typeof candidate.message === 'string' ? candidate.message : 'request failed'
    return reply.code(statusCode).send({
      error: statusCode >= 500 ? 'internal_error' : 'bad_request',
      message: statusCode >= 500 ? 'internal server error' : message,
    })
  })

  return app
}
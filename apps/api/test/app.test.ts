/**
 * Health and route-shape tests.
 *
 * Uses `app.inject()`, so nothing binds a port and no database is required —
 * which is the property being asserted in the first place.
 */
import assert from 'node:assert/strict'
import { after, before, describe, it } from 'node:test'
import type { FastifyInstance } from 'fastify'

process.env['NODE_ENV'] = 'test'
process.env['LOG_LEVEL'] = 'silent'
// Deliberately unset: these must pass with no database configured at all.
delete process.env['DATABASE_URL']

const { buildApp } = await import('../src/app.js')

let app: FastifyInstance

before(async () => {
  app = await buildApp()
  await app.ready()
})

after(async () => {
  await app.close()
})

describe('health', () => {
  for (const path of ['/health', '/healthz']) {
    it(`GET ${path} answers 200 without a database`, async () => {
      const response = await app.inject({ method: 'GET', url: path })

      assert.equal(response.statusCode, 200)
      const body = response.json()
      // apps/web/src/lib/api.ts reads `status` off this body.
      assert.equal(body.status, 'ok')
      assert.equal(body.service, 'idea-flow-api')
      assert.equal(typeof body.uptime, 'number')
      assert.equal(typeof body.timestamp, 'string')
    })
  }
})

describe('graphs', () => {
  it('GET /graphs/demo returns nodes and edges', async () => {
    const response = await app.inject({ method: 'GET', url: '/graphs/demo' })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.ok(Array.isArray(body.nodes) && body.nodes.length > 0, 'expected nodes')
    assert.ok(Array.isArray(body.edges) && body.edges.length > 0, 'expected edges')

    // The web client drops dangling edges and crashes on a bad position, so
    // every edge must reference a node that exists and every node must carry
    // a numeric position.
    const ids = new Set(body.nodes.map((node: { id: string }) => node.id))
    for (const edge of body.edges) {
      assert.ok(ids.has(edge.source), `edge ${edge.id} has an unknown source`)
      assert.ok(ids.has(edge.target), `edge ${edge.id} has an unknown target`)
      assert.notEqual(edge.source, edge.target)
    }
    for (const node of body.nodes) {
      assert.equal(typeof node.position.x, 'number')
      assert.equal(typeof node.position.y, 'number')
      assert.ok(['idea', 'question', 'evidence'].includes(node.data.kind))
    }
    for (const edge of body.edges) {
      assert.ok(['supports', 'derives'].includes(edge.data.kind))
    }
  })

  it('returns a distinct object per request', async () => {
    const first = (await app.inject({ method: 'GET', url: '/graphs/demo' })).json()
    const second = (await app.inject({ method: 'GET', url: '/graphs/demo' })).json()

    // A shared, mutable fixture would let one request corrupt the next.
    assert.notEqual(first, second)
    assert.notEqual(first.nodes[0], second.nodes[0])
  })

  it('GET /graphs lists the demo graph', async () => {
    const response = await app.inject({ method: 'GET', url: '/graphs' })

    assert.equal(response.statusCode, 200)
    assert.deepEqual(response.json().graphs, [{ id: 'demo', href: '/graphs/demo' }])
  })
})

describe('boards', () => {
  it('GET /boards always returns at least the seeded board', async () => {
    const response = await app.inject({ method: 'GET', url: '/boards' })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.equal(body.boards.length, 1)
    assert.equal(body.boards[0].id, 'demo')
    // Unconfigured DATABASE_URL must be reported, not silently pretended.
    assert.equal(body.database, 'unconfigured')
  })

  it('GET /boards/demo returns the board with its graph', async () => {
    const response = await app.inject({ method: 'GET', url: '/boards/demo' })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().graph.nodes.length > 0, true)
  })

  it('GET /boards/:id 404s on an unknown board', async () => {
    const response = await app.inject({ method: 'GET', url: '/boards/nope' })

    assert.equal(response.statusCode, 404)
    assert.equal(response.json().error, 'not_found')
  })
})

describe('unknown routes', () => {
  it('answer JSON 404', async () => {
    const response = await app.inject({ method: 'GET', url: '/does-not-exist' })

    assert.equal(response.statusCode, 404)
    assert.equal(response.json().error, 'not_found')
  })
})
/**
 * The seeded demo graph.
 *
 * Shape mirrors the vocabulary in apps/web/src/types.ts: nodes carry
 * `kind` (idea | question | evidence) and edges carry
 * `kind` (supports | derives). The web client normalises whatever arrives, so
 * this is the shape it happens to understand first — but the payload is plain
 * JSON and the web is tolerant by design.
 *
 * Served from memory, with no database involved: the board must be explorable
 * the moment the stack is up.
 */

export type NodeKind = 'idea' | 'question' | 'evidence'
export type LinkKind = 'supports' | 'derives'

export type DemoNode = {
  id: string
  data: { kind: NodeKind; title: string; note: string; seq: number }
  position: { x: number; y: number }
}

export type DemoEdge = {
  id: string
  source: string
  target: string
  data: { kind: LinkKind }
}

export const DEMO_GRAPH_ID = 'demo'

export const demoNodes: DemoNode[] = [
  {
    id: 'node-idea-spaced-repetition',
    data: {
      kind: 'idea',
      title: 'Spaced repetition beats re-reading',
      note: 'Retrieval practice shows a large, durable retention effect.',
      seq: 0,
    },
    position: { x: 40, y: 120 },
  },
  {
    id: 'node-evidence-dunlosch',
    data: {
      kind: 'evidence',
      title: 'Dunlosch et al. (2013)',
      note: 'Practice testing and distributed practice, Psychological Science in the Public Interest.',
      seq: 1,
    },
    position: { x: 40, y: 380 },
  },
  {
    id: 'node-idea-desirable-difficulty',
    data: {
      kind: 'idea',
      title: 'Difficulty is part of the effect',
      note: 'Desirable difficulties: slow it down now, remember it longer later.',
      seq: 2,
    },
    position: { x: 430, y: 200 },
  },
  {
    id: 'node-question-transfer',
    data: {
      kind: 'question',
      title: 'Does it transfer beyond the exact card?',
      note: 'Free recall tests transfer better than recognition tests.',
      seq: 3,
    },
    position: { x: 430, y: 460 },
  },
  {
    id: 'node-idea-this-board',
    data: {
      kind: 'idea',
      title: 'Build the board around questions',
      note: 'An idea is only as useful as the evidence attached to it.',
      seq: 4,
    },
    position: { x: 820, y: 320 },
  },
]

export const demoEdges: DemoEdge[] = [
  {
    id: 'edge-evidence-supports-retention',
    source: 'node-evidence-dunlosch',
    target: 'node-idea-spaced-repetition',
    data: { kind: 'supports' },
  },
  {
    id: 'edge-difficulty-derives-retention',
    source: 'node-idea-desirable-difficulty',
    target: 'node-idea-spaced-repetition',
    data: { kind: 'derives' },
  },
  {
    id: 'edge-retention-supports-transfer',
    source: 'node-idea-spaced-repetition',
    target: 'node-question-transfer',
    data: { kind: 'supports' },
  },
  {
    id: 'edge-board-derives-transfer',
    source: 'node-idea-this-board',
    target: 'node-question-transfer',
    data: { kind: 'derives' },
  },
]

/**
 * A fresh copy per request: the handler hands the object straight to
 * `reply.send`, and Fastify's serializer must never be handed a structure a
 * consumer could mutate out from under it.
 */
export function demoGraph(): { id: string; nodes: DemoNode[]; edges: DemoEdge[] } {
  return {
    id: DEMO_GRAPH_ID,
    nodes: demoNodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
    edges: demoEdges.map((edge) => ({ ...edge, data: { ...edge.data } })),
  }
}

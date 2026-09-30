import type { IdeaNode, LinkKind, RelationEdge } from '../types'
import { NODE_TYPE, EDGE_TYPE } from '../types'

/* ==========================================================================
   The state the app opens with.

   A real argument about a real subject, laid out so the whole feature set is
   visible on first paint: three kinds, both relations, one edge per column so
   the "growth flows right, causality points back" grammar is obvious before
   anyone touches anything.
   ========================================================================== */

const seed = {
  nodes: [
    {
      id: 'idea-root',
      kind: 'idea',
      seq: 0,
      title: 'Repair clubs out-perform bin incentives',
      note: 'Frame the problem as access, not discipline.',
      position: { x: 40, y: 300 },
    },
    {
      id: 'q-driver',
      kind: 'question',
      seq: 1,
      title: 'What actually makes someone fix instead of dump?',
      note: '',
      position: { x: 470, y: 40 },
    },
    {
      id: 'e-oslo',
      kind: 'evidence',
      seq: 2,
      title: '71% of visitors leave with a working item',
      note: 'Oslo municipal waste audit, 2024',
      position: { x: 470, y: 470 },
    },
    {
      id: 'idea-ritual',
      kind: 'idea',
      seq: 3,
      title: 'Repair is a ritual, not a service',
      note: '',
      position: { x: 900, y: 190 },
    },
    {
      id: 'q-winter',
      kind: 'question',
      seq: 4,
      title: 'Why does half the network sleep in winter?',
      note: '',
      position: { x: 900, y: 560 },
    },
    {
      id: 'e-host',
      kind: 'evidence',
      seq: 5,
      title: 'A host at the door doubles attendance',
      note: 'Volunteer logs, 12 cafés, one winter',
      position: { x: 1330, y: 130 },
    },
  ],
  /**
   * Every edge points at its cause: the question derives FROM the idea, the
   * evidence SUPPORTS it. Six edges, both kinds, no cycles.
   */
  edges: [
    { id: 'e1', source: 'q-driver', target: 'idea-root', kind: 'derives' },
    { id: 'e2', source: 'e-oslo', target: 'idea-root', kind: 'supports' },
    { id: 'e3', source: 'q-driver', target: 'e-oslo', kind: 'derives' },
    { id: 'e4', source: 'idea-ritual', target: 'idea-root', kind: 'derives' },
    { id: 'e5', source: 'q-winter', target: 'idea-ritual', kind: 'derives' },
    { id: 'e6', source: 'e-host', target: 'idea-ritual', kind: 'supports' },
  ],
} satisfies {
  nodes: { id: string; kind: IdeaNode['data']['kind']; seq: number; title: string; note: string; position: { x: number; y: number } }[]
  edges: { id: string; source: string; target: string; kind: LinkKind }[]
}

export const SEED_NODES: IdeaNode[] = seed.nodes.map((n) => ({
  id: n.id,
  type: NODE_TYPE,
  position: n.position,
  data: { kind: n.kind, title: n.title, note: n.note, seq: n.seq },
}))

export const SEED_EDGES: RelationEdge[] = seed.edges.map((e) => ({
  id: e.id,
  type: EDGE_TYPE,
  source: e.source,
  target: e.target,
  data: { kind: e.kind },
}))

/** Next `seq` after the seed, so a new card never reuses a printed number. */
export const SEED_SEQ = seed.nodes.length

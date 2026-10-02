import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  MarkerType,
  type Connection,
  type EdgeChange,
  type EdgeMarker,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react'

import { LINK_META } from '../lib/kinds'
import { uid } from '../lib/ids'
import { SEED_EDGES, SEED_NODES, SEED_SEQ } from '../data/seed'
import { API_BASE, API_CONFIGURED } from '../lib/api'
import { EDGE_TYPE, NODE_TYPE, isLinkKind } from '../types'
import type { IdeaNode, LinkKind, NodeKind, RelationEdge } from '../types'

/* ==========================================================================
   Canvas state

   One store for the whole graph. React Flow stays fully controlled: the canvas
   never holds a node, it only emits changes and renders what lives here — which
   is what makes a reload (or an api load) able to replace the graph wholesale.
   ========================================================================== */

export type ApiState = {
  configured: boolean
  base: string
  status: 'idle' | 'checking' | 'online' | 'offline'
  detail: string
  checkedAt: number | null
}

export type Toast = { id: number; text: string; tone: 'ok' | 'warn' }

type FlowStore = {
  nodes: IdeaNode[]
  edges: RelationEdge[]

  /** the single node the inspector is about (multi-select keeps the last one) */
  focusedId: string | null
  /** the selected edge, if any — drives the contextual toolbar up top */
  edgeId: string | null
  /** the node whose title is currently a textarea */
  editingId: string | null

  /** what a new drag will create */
  linkKind: LinkKind
  /** counter behind the number printed on each card */
  seq: number

  api: ApiState
  toast: Toast | null

  /* --- graph mutations -------------------------------------------------- */
  onNodesChange: (changes: NodeChange<IdeaNode>[]) => void
  onEdgesChange: (changes: EdgeChange<RelationEdge>[]) => void
  /** `kind` overrides the current mode — that is how shift-inversion arrives. */
  connect: (connection: Connection, kind?: LinkKind) => void
  addNode: (kind: NodeKind, center: XYPosition) => string
  updateNode: (id: string, patch: Partial<IdeaNode['data']>) => void
  removeNode: (id: string) => void
  removeEdge: (id: string) => void
  setEdgeKind: (id: string, kind: LinkKind) => void

  /* --- ui state --------------------------------------------------------- */
  /** where the last card was dropped, so a burst of cards does not stack up */
  spawnAt: number
  spawnPos: XYPosition | null
  focus: (id: string | null) => void
  selectEdge: (id: string | null) => void
  setEditing: (id: string | null) => void
  setLinkKind: (kind: LinkKind) => void
  setApi: (patch: Partial<ApiState>) => void
  notify: (text: string, tone?: Toast['tone']) => void
  dismissToast: () => void

  /* --- wholesale replacement ------------------------------------------- */
  applyGraph: (graph: { nodes: IdeaNode[]; edges: RelationEdge[] }) => void
  resetDemo: () => void
}

/* ==========================================================================
   helpers
   ========================================================================== */

const API_STATE: ApiState = {
  configured: API_CONFIGURED,
  base: API_BASE,
  status: 'idle',
  detail: API_CONFIGURED ? 'not checked yet' : 'no api configured',
  checkedAt: null,
}

/** How long a burst of new cards keeps cascading before it starts over. */
const CASCADE_MS = 1400
const CASCADE_STEP = 36

function markerFor(kind: LinkKind): EdgeMarker {
  return {
    type: MarkerType.ArrowClosed,
    color: LINK_META[kind].color,
    // markers scale with stroke width by default, so these are ratios, not px
    width: 7,
    height: 7,
  }
}

/** Every edge owns its own arrow, so flipping a relation recolours the head. */
function withMarker(edge: RelationEdge): RelationEdge {
  const kind = edge.data?.kind ?? 'supports'
  return { ...edge, markerEnd: markerFor(kind) }
}

function markAll(): { nodes: IdeaNode[]; edges: RelationEdge[] } {
  return {
    nodes: SEED_NODES.map((n) => ({ ...n })),
    edges: SEED_EDGES.map(withMarker),
  }
}

/**
 * The seed drawing, on its own.
 *
 * The canvas holds one board at a time, so the seed is not safe there by itself:
 * opening any other board replaces it. This is the same copy `markAll` builds,
 * handed out separately so the place that keeps a drawing per board can put the
 * seed back where it belongs instead of whatever happened to be on screen.
 */
export function seedGraph(): { nodes: IdeaNode[]; edges: RelationEdge[] } {
  return markAll()
}

/** Nothing in the store may keep a pointer to a node that is gone. */
function pruneEdges(edges: RelationEdge[], keep: ReadonlySet<string>): RelationEdge[] {
  return edges.filter((e) => keep.has(e.source) && keep.has(e.target))
}

let toastSeq = 0
let toastTimer: ReturnType<typeof setTimeout> | undefined

/* ==========================================================================
   store
   ========================================================================== */

export const useFlowStore = create<FlowStore>()((set, get) => ({
  ...markAll(),
  focusedId: null,
  edgeId: null,
  editingId: null,
  linkKind: 'supports',
  seq: SEED_SEQ,
  spawnAt: 0,
  spawnPos: null,
  api: API_STATE,
  toast: null,

  /* --- react flow plumbing ------------------------------------------ */

  onNodesChange: (changes) =>
    set((s) => {
      const next = applyNodeChanges(changes, s.nodes)

      // a node deleted by the keyboard or by a change also takes its
      // relations with it, otherwise React Flow renders edges to nowhere
      const removed = new Set(s.nodes.map((n) => n.id))
      for (const n of next) removed.delete(n.id)
      const edges = removed.size > 0 ? pruneEdges(s.edges, new Set(next.map((n) => n.id))) : s.edges

      const editingId =
        s.editingId && next.some((n) => n.id === s.editingId) ? s.editingId : null
      const focusedId = s.focusedId && next.some((n) => n.id === s.focusedId) ? s.focusedId : null

      return { nodes: next, edges, editingId, focusedId }
    }),

  onEdgesChange: (changes) =>
    set((s) => ({
      edges: applyEdgeChanges(changes, s.edges),
      edgeId: s.edgeId && !changes.some((c) => c.type === 'remove' && c.id === s.edgeId) ? s.edgeId : null,
    })),

  connect: (connection, kind) =>
    set((s) => {
      const { source, target } = connection
      if (!source || !target || source === target) return {}
      // one relation per pair keeps the canvas honest
      if (s.edges.some((e) => e.source === source && e.target === target)) return {}

      const relation = kind ?? s.linkKind
      const edge: RelationEdge = {
        ...connection,
        id: uid('e'),
        type: EDGE_TYPE,
        data: { kind: relation },
        markerEnd: markerFor(relation),
      }
      return { edges: addEdge(edge, s.edges) }
    }),

  /* --- nodes -------------------------------------------------------- */

  addNode: (kind, center) => {
    const id = uid(kind)
    set((s) => {
      // a deliberate burst of keystrokes fans the cards out instead of
      // dropping every one of them in the same spot
      const now = performance.now()
      const last = s.spawnPos
      const position =
        last !== null && now - s.spawnAt < CASCADE_MS
          ? { x: last.x + CASCADE_STEP, y: last.y + CASCADE_STEP }
          : center

      const seq = s.seq + 1
      const node: IdeaNode = {
        id,
        type: NODE_TYPE,
        position,
        data: { kind, title: '', note: '', seq },
        selected: true,
      }
      return {
        nodes: [...s.nodes.map((n) => (n.selected ? { ...n, selected: false } : n)), node],
        focusedId: id,
        edgeId: null,
        // straight into the keyboard: creating a card and naming it is one
        // gesture, not three
        editingId: id,
        seq,
        spawnAt: now,
        spawnPos: position,
      }
    })
    return id
  },

  updateNode: (id, patch) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)),
    })),

  removeNode: (id) =>
    set((s) => {
      const nodes = s.nodes.filter((n) => n.id !== id)
      return {
        nodes,
        edges: pruneEdges(s.edges, new Set(nodes.map((n) => n.id))),
        focusedId: s.focusedId === id ? null : s.focusedId,
        editingId: s.editingId === id ? null : s.editingId,
      }
    }),

  /* --- edges -------------------------------------------------------- */

  removeEdge: (id) =>
    set((s) => ({
      edges: s.edges.filter((e) => e.id !== id),
      edgeId: s.edgeId === id ? null : s.edgeId,
    })),

  setEdgeKind: (id, kind) =>
    set((s) => ({
      edges: s.edges.map((e) => (e.id === id ? withMarker({ ...e, data: { kind } }) : e)),
    })),

  /* --- ui ----------------------------------------------------------- */

  focus: (id) => set({ focusedId: id, edgeId: null }),
  selectEdge: (id) => set({ edgeId: id, focusedId: null }),
  setEditing: (id) => set({ editingId: id }),

  setLinkKind: (kind) => set({ linkKind: isLinkKind(kind) ? kind : 'supports' }),

  setApi: (patch) => set((s) => ({ api: { ...s.api, ...patch } })),

  notify: (text, tone = 'ok') => {
    if (toastTimer) clearTimeout(toastTimer)
    const id = (toastSeq += 1)
    set({ toast: { id, text, tone } })
    toastTimer = setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null })
    }, 4200)
  },

  dismissToast: () => {
    if (toastTimer) clearTimeout(toastTimer)
    set({ toast: null })
  },

  /* --- wholesale ---------------------------------------------------- */

  applyGraph: (graph) =>
    set(() => ({
      nodes: graph.nodes,
      edges: graph.edges.map(withMarker),
      focusedId: null,
      edgeId: null,
      editingId: null,
      seq: Math.max(0, ...graph.nodes.map((n) => (Number.isFinite(n.data.seq) ? n.data.seq : 0))),
    })),

  resetDemo: () =>
    set(() => ({
      ...markAll(),
      focusedId: null,
      edgeId: null,
      editingId: null,
      linkKind: 'supports',
      seq: SEED_SEQ,
      spawnAt: 0,
      spawnPos: null,
      toast: null,
    })),
}))

/* ==========================================================================
   selectors
   ========================================================================== */

export const useLinkKind = () => useFlowStore((s) => s.linkKind)
export const useApiState = () => useFlowStore((s) => s.api)

/** The node the inspector is about, or null. */
export function useFocusedNode(): IdeaNode | null {
  return useFlowStore((s) => (s.focusedId ? (s.nodes.find((n) => n.id === s.focusedId) ?? null) : null))
}

export function useSelectedEdge(): RelationEdge | null {
  return useFlowStore((s) => (s.edgeId ? (s.edges.find((e) => e.id === s.edgeId) ?? null) : null))
}

/** The node the keyboard is currently writing into, if any. */
export function useEditingNode(): IdeaNode | null {
  return useFlowStore((s) => (s.editingId ? (s.nodes.find((n) => n.id === s.editingId) ?? null) : null))
}

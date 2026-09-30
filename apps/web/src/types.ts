import type { Edge, Node } from '@xyflow/react'

/* ==========================================================================
   Graph vocabulary
   ========================================================================== */

/** The three kinds of thing that can sit on the canvas. */
export type NodeKind = 'idea' | 'question' | 'evidence'

/**
 * How two nodes are related.
 *
 * The gesture is always the same — drag from the node doing the supporting or
 * deriving to the other one — and only the reading of the arrow changes:
 *
 *   supports  :  A —supports→ B     "A supports B"
 *   derives   :  A —derives from→ B "A derives from B"
 *
 * So every arrow on the canvas points back at the cause, and new material
 * grows to the right. That is the whole visual grammar.
 */
export type LinkKind = 'supports' | 'derives'

export const NODE_KINDS: readonly NodeKind[] = ['idea', 'question', 'evidence']
export const LINK_KINDS: readonly LinkKind[] = ['supports', 'derives']

/** Payload of an Idea Flow node. `seq` doubles as the stagger index. */
export type IdeaNodeData = {
  kind: NodeKind
  title: string
  note: string
  seq: number
}

/** Payload of a relation edge. */
export type RelationEdgeData = {
  kind: LinkKind
}

export type IdeaNode = Node<IdeaNodeData, 'ideaFlow'>
export type RelationEdge = Edge<RelationEdgeData, 'relation'>

/** The only node component this app registers. */
export const NODE_TYPE = 'ideaFlow' as const
export const EDGE_TYPE = 'relation' as const

/* ==========================================================================
   Narrowing helpers
   ========================================================================== */

export function isNodeKind(value: unknown): value is NodeKind {
  return value === 'idea' || value === 'question' || value === 'evidence'
}

export function isLinkKind(value: unknown): value is LinkKind {
  return value === 'supports' || value === 'derives'
}

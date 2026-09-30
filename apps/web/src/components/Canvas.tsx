import { useCallback, useEffect, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  type IsValidConnection,
  type OnSelectionChangeParams,
} from '@xyflow/react'

import { useFlowStore } from '../store/flowStore'
import { LINK_META } from '../lib/kinds'
import { IdeaFlowNode } from './nodes/IdeaFlowNode'
import { RelationEdge } from './edges/RelationEdge'
import { EDGE_TYPE, NODE_TYPE } from '../types'
import type { IdeaNode, RelationEdge as RelationEdgeType } from '../types'

/*
 * Registered outside the component on purpose: React Flow re-creates its
 * internals when the type maps change identity, which would remount the whole
 * graph (and restart every entrance animation) on every render.
 */
const nodeTypes = { [NODE_TYPE]: IdeaFlowNode }
const edgeTypes = { [EDGE_TYPE]: RelationEdge }

/** Rejecting a connection up front is better feedback than a silent no-op. */
const isValidConnection: IsValidConnection = (connection) => {
  const { source, target } = connection
  if (!source || !target || source === target) return false
  return !useFlowStore
    .getState()
    .edges.some((edge) => edge.source === source && edge.target === target)
}

/**
 * Shift is not available on the connect callback, so it is tracked here. A ref
 * is enough — the drag is a mouse gesture and nothing re-renders for this.
 */
function useShiftHeld() {
  const [held, setHeld] = useState(false)
  useEffect(() => {
    const read = (event: KeyboardEvent) => setHeld(event.shiftKey)
    const release = () => setHeld(false)
    window.addEventListener('keydown', read, true)
    window.addEventListener('keyup', read, true)
    window.addEventListener('blur', release)
    return () => {
      window.removeEventListener('keydown', read, true)
      window.removeEventListener('keyup', read, true)
      window.removeEventListener('blur', release)
    }
  }, [])
  return held
}

export function Canvas() {
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const onNodesChange = useFlowStore((s) => s.onNodesChange)
  const onEdgesChange = useFlowStore((s) => s.onEdgesChange)
  const onConnect = useFlowStore((s) => s.connect)
  const focus = useFlowStore((s) => s.focus)
  const selectEdge = useFlowStore((s) => s.selectEdge)
  const linkKind = useFlowStore((s) => s.linkKind)
  const shiftHeld = useShiftHeld()

  /**
   * The rubber band wears the colour of the relation it is about to create, and
   * holding shift flips which one that is — so both are reachable without
   * leaving the drag.
   */
  const handleConnect = useCallback(
    (connection: Parameters<typeof onConnect>[0]) => {
      const inverted =
        linkKind === 'supports' ? 'derives' : ('supports' as const)
      onConnect(connection, shiftHeld ? inverted : linkKind)
    },
    [linkKind, onConnect, shiftHeld],
  )

  /**
   * React Flow owns which things are selected; the store only needs to know so
   * the inspector and the contextual toolbar can show up. Kept as two separate
   * concerns on purpose — the store never writes `selected` back from here, so
   * this cannot loop.
   */
  const onSelectionChange = useCallback(
    ({ nodes: picked, edges: pickedEdges }: OnSelectionChangeParams) => {
      const node = picked[picked.length - 1]
      const edge = pickedEdges[pickedEdges.length - 1]
      if (node) focus(node.id)
      else if (edge) selectEdge(edge.id)
      else {
        focus(null)
        selectEdge(null)
      }
    },
    [focus, selectEdge],
  )

  // the rubber band wears the colour of the relation it is about to create
  const link = LINK_META[linkKind]

  return (
    <div className="absolute inset-0">
      <ReactFlow<IdeaNode, RelationEdgeType>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={onSelectionChange}
        isValidConnection={isValidConnection}
        connectionLineStyle={{
          stroke: link.color,
          strokeWidth: 1.8,
          strokeDasharray: link.dashed ? '7 6' : undefined,
        }}
        defaultEdgeOptions={{ type: EDGE_TYPE, animated: false }}
        fitView
        fitViewOptions={{ padding: 0.16, maxZoom: 1 }}
        minZoom={0.2}
        maxZoom={1.8}
        snapToGrid
        snapGrid={[8, 8]}
        /* fat enough to catch a quick drag between two cards */
        connectionRadius={36}
        /* both keys, so nothing depends on a platform convention */
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Shift', 'Meta', 'Control']}
        panOnScroll
        selectionOnDrag
        proOptions={{ hideAttribution: true }}
        aria-label="Idea Flow canvas"
      >
        {/*
          Two grids: a fine dot field and a coarse rule, like drafting paper.
          Both take a `var()` rather than a literal, so the same pattern
          repaints itself when the lamp changes — dark board, pale dots; white
          board, dark dots — without re-rendering the graph.

          The numbers are a proportion, not a guess. xyflow scales `size` and
          `gap` by the same zoom, so what you read on screen is always
          size / (2 * gap) = 3.0 / 52 ≈ 11.5% — a dot you can actually see,
          which is what 5% was not. The gap stays at 26 because the rule grid below
          sits at 130, exactly five cells down, so the rules keep falling on
          every fifth dot and the field reads as subdivided paper.
        */}
        <Background
          id="dots"
          variant={BackgroundVariant.Dots}
          gap={26}
          size={3.0}
          color="var(--color-dot)"
        />
        <Background
          id="rules"
          variant={BackgroundVariant.Lines}
          gap={130}
          lineWidth={1}
          color="var(--color-rule)"
        />
      </ReactFlow>

      {nodes.length === 0 && <EmptyBoard />}
    </div>
  )
}

function EmptyBoard() {
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center px-6">
      <div className="anim-rise max-w-[22rem] text-center">
        <p className="micro text-fg-faint">empty board</p>
        <p className="mt-2.5 text-[1.6rem] leading-tight font-bold tracking-[-0.022em] text-fg">
          Nothing here yet.
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-dim">
          Add an idea from the left, then drag between the dots on two cards to say how they
          relate.
        </p>
      </div>
    </div>
  )
}

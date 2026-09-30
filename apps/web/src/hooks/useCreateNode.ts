import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'

import { useFlowStore } from '../store/flowStore'
import type { NodeKind } from '../types'

/**
 * Quick creation.
 *
 * Every entry point — the rail buttons, the `I`/`Q`/`E` keys, `fit view` after
 * a reset — funnels through here, so a new card always lands in the middle of
 * what the user is looking at and opens for typing.
 */
export function useCreateNode() {
  const addNode = useFlowStore((s) => s.addNode)
  const { screenToFlowPosition } = useReactFlow()

  return useCallback(
    (kind: NodeKind) => {
      // the canvas fills the viewport, so the window centre is the pane centre
      const center = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
      addNode(kind, screenToFlowPosition(center))
    },
    [addNode, screenToFlowPosition],
  )
}

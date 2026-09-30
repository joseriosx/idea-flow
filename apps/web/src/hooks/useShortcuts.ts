import { useCallback, useEffect } from 'react'
import { useReactFlow } from '@xyflow/react'

import { useCreateNode } from './useCreateNode'
import { useTheme } from './useTheme'
import { useFlowStore } from '../store/flowStore'
import { KIND_META } from '../lib/kinds'
import { NODE_KINDS } from '../types'
import type { NodeKind } from '../types'

/**
 * key -> kind, derived from the same table the rail badges print, so a shortcut
 * can never drift from the letter shown on screen.
 */
const BY_KEY: Record<string, NodeKind> = Object.fromEntries(
  NODE_KINDS.map((kind) => [KIND_META[kind].key.toLowerCase(), kind]),
)

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target instanceof HTMLElement ? target : null
  if (!el) return false
  return el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
}

/**
 * The single place every keyboard gesture is bound, so the rail, the legend and
 * the hint bar can advertise shortcuts instead of hiding them.
 */
export function useShortcuts() {
  const create = useCreateNode()
  const setLinkKind = useFlowStore((s) => s.setLinkKind)
  const setEditing = useFlowStore((s) => s.setEditing)
  const focus = useFlowStore((s) => s.focus)
  const selectEdge = useFlowStore((s) => s.selectEdge)
  const resetDemo = useFlowStore((s) => s.resetDemo)
  const { toggle: toggleTheme } = useTheme()
  const { fitView } = useReactFlow()

  const fit = useCallback(() => {
    void fitView({ padding: 0.16, duration: 420, maxZoom: 1 })
  }, [fitView])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // never steal a keystroke from a text field, and leave browser chords be
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      if (event.key === 'Escape') {
        setEditing(null)
        focus(null)
        selectEdge(null)
        return
      }

      const kind = BY_KEY[event.key.toLowerCase()]
      if (kind) {
        event.preventDefault()
        create(kind)
        return
      }

      switch (event.key.toLowerCase()) {
        case 's':
          setLinkKind('supports')
          break
        case 'd':
          setLinkKind('derives')
          break
        case 'f':
          event.preventDefault()
          fit()
          break
        case 'r':
          event.preventDefault()
          resetDemo()
          // the demo board has its own coordinates, so re-frame after the swap
          requestAnimationFrame(fit)
          break
        case 't':
          event.preventDefault()
          toggleTheme()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [create, fit, focus, resetDemo, selectEdge, setEditing, setLinkKind, toggleTheme])
}

import { useCallback } from 'react'
import { useReactFlow } from '@xyflow/react'

import { useFlowStore } from '../../store/flowStore'
import { ThemeToggle } from './ThemeToggle'
import { IconFrame, IconMinus, IconPlus, IconRewind } from '../icons'

function SquareButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="grid h-8 w-8 place-items-center rounded-lg text-fg-dim transition-colors hover:bg-hover hover:text-fg"
    >
      {children}
    </button>
  )
}

/**
 * Camera and board controls.
 *
 * The zoom/fit cluster replaces React Flow's own <Controls> so it can speak the
 * same visual language as everything else; the reset sits under it, one click
 * away from the demo graph it replaces, and the lamp switch closes the stack —
 * every control that changes the board rather than the view.
 */
export function ControlCluster() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  const resetDemo = useFlowStore((s) => s.resetDemo)
  const notify = useFlowStore((s) => s.notify)

  const fit = useCallback(() => {
    void fitView({ padding: 0.16, duration: 420, maxZoom: 1 })
  }, [fitView])

  return (
    <div
      className="anim-rise absolute bottom-5 right-5 z-10 flex flex-col items-end gap-2"
      style={{ animationDelay: '460ms' }}
    >
      <div className="hud flex flex-col gap-0.5 rounded-xl p-1">
        <SquareButton onClick={() => void zoomIn({ duration: 180 })} title="Zoom in">
          <IconPlus />
        </SquareButton>
        <SquareButton onClick={() => void zoomOut({ duration: 180 })} title="Zoom out">
          <IconMinus />
        </SquareButton>
        <div className="mx-1.5 my-1 h-px bg-divider" />
        <SquareButton onClick={fit} title="Fit the whole board — F">
          <IconFrame />
        </SquareButton>
        <div className="mx-1.5 my-1 h-px bg-divider" />
        <SquareButton
          onClick={() => {
            resetDemo()
            notify('board reset to the demo graph')
            requestAnimationFrame(fit)
          }}
          title="Reset to the demo graph — R"
        >
          <IconRewind />
        </SquareButton>
        <div className="mx-1.5 my-1 h-px bg-divider" />
        <ThemeToggle />
      </div>
    </div>
  )
}

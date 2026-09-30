import { useFlowStore, useSelectedEdge } from '../../store/flowStore'
import { LINK_META, withAlpha } from '../../lib/kinds'
import { LINK_KINDS } from '../../types'
import { IconClose, IconTrash } from '../icons'

/**
 * The contextual bar at the top centre.
 *
 * One slot, two jobs: normally it declares which relation a drag is about to
 * create; the moment a line is selected it becomes that line's editor. No
 * dialogs, no floating toolbars around every edge — a relationship is a
 * first-class thing on this canvas, so it gets edited on the spot.
 */
export function ContextBar() {
  const linkKind = useFlowStore((s) => s.linkKind)
  const setLinkKind = useFlowStore((s) => s.setLinkKind)
  const setEdgeKind = useFlowStore((s) => s.setEdgeKind)
  const removeEdge = useFlowStore((s) => s.removeEdge)
  const selectEdge = useFlowStore((s) => s.selectEdge)
  const edge = useSelectedEdge()

  const current = edge ? (edge.data?.kind ?? 'supports') : linkKind

  return (
    <div
      className="anim-rise absolute left-1/2 top-4 z-10 -translate-x-1/2"
      style={{ animationDelay: '160ms' }}
    >
      <div className="hud flex items-center gap-1 rounded-full p-1">
        <span className="label hidden pl-3 pr-1 sm:block">
          {edge ? 'this line' : 'new link'}
        </span>

        {LINK_KINDS.map((kind) => {
          const meta = LINK_META[kind]
          const active = current === kind
          return (
            <button
              key={kind}
              type="button"
              onClick={() => (edge ? setEdgeKind(edge.id, kind) : setLinkKind(kind))}
              title={meta.hint}
              className="flex items-center gap-2 rounded-full px-3 py-[7px] text-[11.5px] font-bold transition-all duration-200"
              style={{
                background: active ? meta.wash : 'transparent',
                color: active ? meta.color : 'var(--color-fg-dim)',
                boxShadow: active ? `inset 0 0 0 1px ${withAlpha(meta.color, 0.35)}` : 'none',
              }}
            >
              <svg width="16" height="8" viewBox="0 0 16 8" aria-hidden="true">
                <path
                  d="M0 4h11"
                  stroke={meta.color}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeDasharray={meta.dashed ? '3.5 3' : undefined}
                  opacity={active ? 1 : 0.55}
                />
                <path d="M11 1.2L15 4l-4 2.8z" fill={meta.color} opacity={active ? 1 : 0.55} />
              </svg>
              {meta.label}
            </button>
          )
        })}

        {edge ? (
          <span className="ml-0.5 flex items-center gap-0.5 border-l border-divider pl-1.5 pr-1">
            <button
              type="button"
              onClick={() => removeEdge(edge.id)}
              title="Remove this line"
              className="grid h-7 w-7 place-items-center rounded-full text-fg-dim transition-colors hover:bg-hover hover:text-fg"
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => selectEdge(null)}
              title="Done"
              className="grid h-7 w-7 place-items-center rounded-full text-fg-dim transition-colors hover:bg-hover hover:text-fg"
            >
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </span>
        ) : (
          <span className="hidden items-center gap-1.5 pr-2.5 pl-2 text-[10px] font-normal text-fg-faint lg:flex">
            hold <span className="kbd">shift</span> to invert
          </span>
        )}
      </div>
    </div>
  )
}

import { memo } from 'react'
import { EdgeLabelRenderer, getBezierPath, type EdgeProps } from '@xyflow/react'

import { useFlowStore } from '../../store/flowStore'
import { LINK_META } from '../../lib/kinds'
import type { RelationEdge as RelationEdgeType } from '../../types'

/**
 * A relation.
 *
 * Both relation types are drawn the same way — a soft curve with an arrow that
 * always points at the cause — and differ only in colour and in whether the
 * line is dashed. Solid is something observed, dashed is something reasoned.
 * The phrase is written on the line, so nothing has to be decoded from a
 * legend, and the whole line is one fat hit target.
 */
function RelationEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<RelationEdgeType>) {
  const selectEdge = useFlowStore((s) => s.selectEdge)

  const kind = data?.kind ?? 'supports'
  const meta = LINK_META[kind]

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.32,
  })

  return (
    <>
      {/* glow only while selected — a permanent halo makes a dense graph foggy */}
      {selected && (
        <path d={path} fill="none" stroke={meta.color} strokeWidth={8} strokeOpacity={0.14} />
      )}

      <path
        d={path}
        fill="none"
        stroke={meta.color}
        strokeOpacity={selected ? 0.95 : 0.5}
        strokeWidth={selected ? 2.4 : 1.6}
        strokeLinecap="round"
        markerEnd={markerEnd}
        className={meta.dashed ? 'edge-march' : undefined}
      />

      {/* invisible, generous, clickable */}
      <path
        d={path}
        className="edge-hit"
        onClick={(event) => {
          event.stopPropagation()
          selectEdge(id)
        }}
      />

      <EdgeLabelRenderer>
        <button
          type="button"
          data-selected={selected ? 'true' : 'false'}
          className="nodrag nopan absolute flex items-center gap-1.5 rounded-full border px-2 py-[3px] text-[9px] font-bold uppercase tracking-[0.08em] transition-all duration-200"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            background: 'color-mix(in oklab, var(--color-panel) 82%, transparent)',
            borderColor: selected ? meta.color : 'var(--line)',
            color: selected ? meta.color : 'var(--color-fg-mid)',
            backdropFilter: 'blur(8px)',
          }}
          onClick={(event) => {
            event.stopPropagation()
            selectEdge(id)
          }}
        >
          <span
            className="h-1 w-1 shrink-0 rounded-full"
            style={{ background: meta.color, opacity: selected ? 1 : 0.65 }}
          />
          {meta.phrase}
        </button>
      </EdgeLabelRenderer>
    </>
  )
}

export const RelationEdge = memo(RelationEdgeComponent)

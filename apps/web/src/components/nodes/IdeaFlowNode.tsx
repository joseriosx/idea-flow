import { memo, useEffect, useRef, useState } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

import { useFlowStore } from '../../store/flowStore'
import { KIND_META, KindGlyph } from '../../lib/kinds'
import { pad2 } from '../../lib/ids'
import type { IdeaNode } from '../../types'

/** Caps the entrance stagger so a busy board never takes seconds to settle. */
const MAX_STAGGER = 12

/**
 * A card on the canvas.
 *
 * Paper on an ink surface: the kind is carried by a single accent (top rail,
 * glyph, note rule) so a dense graph still reads at a glance, and the only
 * interactive chrome — the two link dots — stays out of the way until hover.
 */
function IdeaFlowNodeCard({ id, data, selected }: NodeProps<IdeaNode>) {
  const editing = useFlowStore((s) => s.editingId === id)
  const setEditing = useFlowStore((s) => s.setEditing)
  const updateNode = useFlowStore((s) => s.updateNode)
  const focus = useFlowStore((s) => s.focus)

  const [draft, setDraft] = useState(data.title)
  const editor = useRef<HTMLTextAreaElement>(null)

  /**
   * React Flow keeps a node `visibility: hidden` until it has measured it, and
   * a hidden element cannot take focus. So the editor asks for focus across a
   * few frames instead of once — otherwise "click Idea, then type" would type
   * into the void.
   */
  useEffect(() => {
    if (!editing) return
    setDraft(data.title)

    let frame = 0
    let tries = 0
    const grab = () => {
      const el = editor.current
      if (el && getComputedStyle(el).visibility === 'visible') {
        el.focus()
        el.select()
        return
      }
      // normally two or three frames; the cap is only a safety net
      if (tries++ < 40) frame = requestAnimationFrame(grab)
    }
    frame = requestAnimationFrame(grab)

    return () => cancelAnimationFrame(frame)
  }, [editing, data.title])

  const commit = () => {
    const title = draft.trim()
    updateNode(id, { title: title === '' ? 'untitled' : title })
    setEditing(null)
  }

  const cancel = () => setEditing(null)

  const meta = KIND_META[data.kind]
  const lit = selected || editing

  return (
    <div
      className="card anim-card group/card"
      data-kind={data.kind}
      data-selected={lit ? 'true' : 'false'}
      style={{ animationDelay: `${Math.min(data.seq, MAX_STAGGER) * 65}ms` }}
      onDoubleClick={(event) => {
        event.stopPropagation()
        focus(id)
        setEditing(id)
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-[3px] rounded-t-[14px]"
        style={{ background: meta.color }}
      />

      <div className="flex items-center gap-[7px] px-3 pt-[13px]">
        <span style={{ color: meta.color }}>
          <KindGlyph kind={data.kind} className="h-3.5 w-3.5" />
        </span>
        <span className="micro text-paper-600">{meta.label}</span>
        <span className="micro ml-auto tabular-nums tracking-[0.08em] text-paper-600/60">
          {pad2(data.seq + 1)}
        </span>
      </div>

      <div className="px-3 pb-2 pt-2">
        {editing ? (
          <textarea
            ref={editor}
            className="card-editor nodrag nowheel"
            value={draft}
            placeholder="name it"
            rows={2}
            spellCheck={false}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                commit()
              }
              if (event.key === 'Escape') {
                event.preventDefault()
                event.stopPropagation()
                cancel()
              }
            }}
            onBlur={commit}
            onPointerDown={(event) => event.stopPropagation()}
          />
        ) : (
          <h3 className={`card-title ${data.title === '' ? 'text-paper-600/50' : ''}`}>
            {data.title === '' ? 'untitled' : data.title}
          </h3>
        )}
      </div>

      {data.note !== '' && (
        <p
          className="mx-3 mb-1 border-l-2 pl-2 text-[11px] font-normal leading-[1.45] text-paper-600"
          style={{ borderLeftColor: meta.color }}
        >
          {data.note}
        </p>
      )}

      {/* the hint keeps its box when hidden, so hovering never resizes a card */}
      <p className="micro px-3 pb-2.5 pt-1.5 tracking-[0.16em] text-paper-600/50 opacity-0 transition-opacity duration-200 group-hover/card:opacity-100">
        double-click to edit
      </p>

      <Handle type="target" position={Position.Left} id="in" />
      <Handle type="source" position={Position.Right} id="out" />
    </div>
  )
}

export const IdeaFlowNode = memo(IdeaFlowNodeCard)

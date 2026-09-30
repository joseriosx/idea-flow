import { useFlowStore, useFocusedNode } from '../store/flowStore'
import { KIND_META, KindGlyph, LINK_META, withAlpha } from '../lib/kinds'
import { NODE_KINDS } from '../types'
import { IconArrow, IconClose, IconSwap, IconTrash } from './icons'
import { pad2 } from '../lib/ids'

const FIELD =
  'w-full rounded-lg border border-line bg-well px-2.5 py-2 text-[12.5px] font-normal leading-snug text-fg outline-none transition-colors placeholder:text-fg-faint focus:border-line-hi'

/**
 * What is selected, and what it is attached to.
 *
 * A panel rather than a modal: the board keeps working behind it, and a card's
 * kind, wording and relations are all editable from one place while the graph
 * stays in view. It appears only when something is actually selected, so an
 * untouched board is just the canvas.
 */
export function Inspector() {
  const node = useFocusedNode()
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)
  const updateNode = useFlowStore((s) => s.updateNode)
  const removeNode = useFlowStore((s) => s.removeNode)
  const removeEdge = useFlowStore((s) => s.removeEdge)
  const setEdgeKind = useFlowStore((s) => s.setEdgeKind)
  const focus = useFlowStore((s) => s.focus)

  if (!node) return null

  const meta = KIND_META[node.data.kind]
  const relations = edges.filter((e) => e.source === node.id || e.target === node.id)

  return (
    <aside
      className="anim-rise hud thin-scroll absolute top-[5.5rem] right-5 bottom-24 z-10 w-[17.5rem] overflow-y-auto rounded-2xl p-3.5 max-md:inset-x-3 max-md:top-auto max-md:bottom-[7.5rem] max-md:w-auto"
      style={{ animationDelay: '60ms' }}
    >
      <div className="flex items-center gap-2">
        <span style={{ color: meta.color }}>
          <KindGlyph kind={node.data.kind} className="h-3.5 w-3.5" />
        </span>
        <span className="micro text-fg-dim">
          card {pad2(node.data.seq + 1)}
        </span>
        <button
          type="button"
          onClick={() => focus(null)}
          title="Close"
          className="ml-auto grid h-6 w-6 place-items-center rounded-md text-fg-faint transition-colors hover:bg-hover hover:text-fg"
        >
          <IconClose className="h-3 w-3" />
        </button>
      </div>

      {/* kind */}
      <p className="label mt-4">kind</p>
      <div className="mt-2 grid grid-cols-3 gap-1">
        {NODE_KINDS.map((kind) => {
          const other = KIND_META[kind]
          const active = kind === node.data.kind
          return (
            <button
              key={kind}
              type="button"
              onClick={() => updateNode(node.id, { kind })}
              title={other.blurb}
              className="flex flex-col items-center gap-1 rounded-lg border py-2 transition-all duration-200"
              style={{
                background: active ? other.wash : 'var(--well)',
                borderColor: active ? withAlpha(other.color, 0.4) : 'var(--line)',
                color: active ? other.color : 'var(--color-fg-dim)',
              }}
            >
              <KindGlyph kind={kind} className="h-3.5 w-3.5" />
              <span className="text-[8.5px] font-bold uppercase tracking-[0.06em]">
                {other.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* title */}
      <p className="label mt-4">what it says</p>
      <input
        className={`${FIELD} mt-2`}
        value={node.data.title}
        placeholder="untitled"
        onChange={(event) => updateNode(node.id, { title: event.target.value })}
      />

      {/* note */}
      <p className="label mt-4">{node.data.kind === 'evidence' ? 'where it came from' : 'anything else'}</p>
      <textarea
        className={`${FIELD} mt-2 resize-none`}
        rows={3}
        value={node.data.note}
        placeholder={node.data.kind === 'evidence' ? 'a citation, a link, a date' : 'optional'}
        onChange={(event) => updateNode(node.id, { note: event.target.value })}
      />

      {/* relations */}
      <p className="label mt-4">
        {relations.length === 0 ? 'not attached to anything' : `attached to ${relations.length}`}
      </p>
      {relations.length > 0 && (
        <ul className="mt-2 space-y-1">
          {relations.map((edge) => {
            const outgoing = edge.source === node.id
            const otherId = outgoing ? edge.target : edge.source
            const other = nodes.find((n) => n.id === otherId)
            const link = LINK_META[edge.data?.kind ?? 'supports']
            const inverted = (edge.data?.kind ?? 'supports') === 'derives'

            return (
              <li
                key={edge.id}
                className="group flex items-center gap-2 rounded-lg border border-line bg-well px-2 py-1.5"
              >
                <span
                  title={outgoing ? 'this card points at the other' : 'the other points at this card'}
                  style={{ color: link.color }}
                  className="shrink-0"
                >
                  {/* the arrow shows which way the relation reads from here */}
                  <IconArrow direction={outgoing ? 'right' : 'left'} className="h-3 w-3" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[11.5px] font-bold leading-tight text-fg">
                    {other?.data.title || 'untitled'}
                  </span>
                  <span
                    className="block text-[8.5px] font-bold uppercase tracking-[0.08em] leading-tight"
                    style={{ color: link.color }}
                  >
                    {outgoing ? link.phrase : inverted ? 'is derived from' : 'is supported by'}
                  </span>
                </span>

                <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() =>
                      setEdgeKind(edge.id, link.dashed ? 'supports' : 'derives')
                    }
                    title="Swap the relation"
                    className="grid h-6 w-6 place-items-center rounded-md text-fg-dim transition-colors hover:bg-hover hover:text-fg"
                  >
                    <IconSwap className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeEdge(edge.id)}
                    title="Remove this line"
                    className="grid h-6 w-6 place-items-center rounded-md text-fg-dim transition-colors hover:bg-hover hover:text-fg"
                  >
                    <IconClose className="h-3 w-3" />
                  </button>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <div className="hairline my-4" />

      <button
        type="button"
        onClick={() => removeNode(node.id)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-line py-2 text-[11.5px] font-bold text-fg-dim transition-colors hover:border-[#e0705f]/40 hover:bg-[#e0705f]/10 hover:text-[#e0705f]"
      >
        <IconTrash className="h-3.5 w-3.5" />
        remove this card
      </button>
    </aside>
  )
}

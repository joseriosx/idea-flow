import { useCreateNode } from '../../hooks/useCreateNode'
import { KIND_META, KindGlyph, withAlpha } from '../../lib/kinds'
import { NODE_KINDS } from '../../types'

/**
 * The creation rail.
 *
 * The only permanent way to add something. Three kinds, each with its key
 * printed on it, so the shortcut is taught by the interface instead of
 * documented somewhere nobody opens.
 */
export function NodeRail() {
  const create = useCreateNode()

  return (
    <div
      className="anim-rise absolute bottom-4 left-1/2 z-10 -translate-x-1/2 md:top-1/2 md:bottom-auto md:left-5 md:translate-x-0 md:-translate-y-1/2"
      style={{ animationDelay: '90ms' }}
    >
      <p className="label mb-2 pl-1.5">add</p>
      <div className="flex flex-row gap-1.5 md:flex-col">
        {NODE_KINDS.map((kind) => {
          const meta = KIND_META[kind]
          return (
            <button
              key={kind}
              type="button"
              onClick={() => create(kind)}
              title={`Add an ${meta.label.toLowerCase()} — ${meta.key}`}
              className="group flex w-[10.5rem] items-center gap-2.5 rounded-xl border border-line bg-panel/80 px-2.5 py-2 text-left backdrop-blur-md transition-all duration-200 hover:translate-x-1 hover:border-line-hi hover:bg-panel-hover md:w-[13.5rem]"
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border transition-transform duration-200 group-hover:scale-105"
                style={{
                  background: meta.wash,
                  borderColor: withAlpha(meta.color, 0.3),
                  color: meta.color,
                }}
              >
                <KindGlyph kind={kind} className="h-4 w-4" />
              </span>

              <span className="min-w-0">
                <span className="block text-[12.5px] font-bold leading-tight text-fg">
                  {meta.label}
                </span>
                <span className="hidden truncate text-[10.5px] font-normal leading-tight text-fg-faint md:block">
                  {meta.blurb}
                </span>
              </span>

              <span className="kbd ml-auto hidden shrink-0 md:inline-block">{meta.key}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

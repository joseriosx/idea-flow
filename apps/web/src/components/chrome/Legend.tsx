import { LINK_META } from '../../lib/kinds'
import { LINK_KINDS } from '../../types'

/**
 * How to read a line.
 *
 * The grammar is not obvious on first sight — every arrow points left, even
 * though the material grows rightward — so it is stated once, here, instead of
 * being left for someone to work out.
 */
export function Legend() {
  return (
    <div
      className="anim-rise absolute bottom-5 left-5 z-10 hidden lg:block"
      style={{ animationDelay: '400ms' }}
    >
      <p className="label mb-2 pl-1.5">reading a line</p>
      <div className="hud space-y-1.5 rounded-xl px-3 py-2.5">
        {LINK_KINDS.map((kind) => {
          const meta = LINK_META[kind]
          return (
            <div key={kind} className="flex items-center gap-2.5">
              <svg width="32" height="10" viewBox="0 0 32 10" className="shrink-0" aria-hidden="true">
                <path
                  d="M1 5h21"
                  stroke={meta.color}
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeDasharray={meta.dashed ? '4 3.5' : undefined}
                />
                <path d="M22 1.6L30 5l-8 3.4z" fill={meta.color} />
              </svg>
              <span className="min-w-0">
                <span
                  className="micro block leading-tight"
                  style={{ color: meta.color }}
                >
                  {meta.label}
                </span>
                <span className="block text-[10px] font-normal leading-tight text-fg-faint">
                  {meta.hint}
                </span>
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-2 max-w-[15.5rem] text-[10.5px] font-normal leading-[1.5] text-fg-faint">
        New material grows to the right. Every arrow points back at its cause.
      </p>
    </div>
  )
}

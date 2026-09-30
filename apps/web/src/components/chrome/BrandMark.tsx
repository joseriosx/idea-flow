import { useNavStore } from '../../store/navStore'

/**
 * Identity, and the way back.
 *
 * The mark is the only part of the chrome that is a control rather than a
 * readout, so it is a button: the whole block, with the name in the idea accent
 * on hover to say so. It keeps the exact layout it always had — same position,
 * same type, same rule — because a board that moved when it gained a link would
 * be a board everyone had to re-find.
 */
export function BrandMark() {
  const goHome = useNavStore((s) => s.goHome)

  return (
    <div
      className="anim-rise absolute left-5 top-5 z-10"
      style={{ animationDelay: '0ms' }}
    >
      <button
        type="button"
        onClick={goHome}
        title="Back to the projects"
        aria-label="Idea Flow — back to the projects"
        className="group block max-w-[16rem] cursor-pointer select-none text-left"
      >
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[1.5rem] leading-none font-bold tracking-[-0.022em] text-fg transition-colors duration-200 group-hover:text-idea">
            Idea Flow
          </h1>
          <span className="micro text-fg-faint">canvas</span>
        </div>
        <div className="hairline mt-2.5 w-40 transition-opacity duration-200 group-hover:opacity-100" />
        <p className="mt-2 max-w-[15.5rem] text-[11px] leading-[1.55] text-fg-dim">
          Ideas, the questions behind them, and the evidence underneath.
        </p>
      </button>
    </div>
  )
}

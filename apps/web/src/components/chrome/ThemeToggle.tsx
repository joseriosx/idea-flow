import { useTheme } from '../../hooks/useTheme'
import { IconMoon, IconSun } from '../icons'

/**
 * Which lamp the board is under.
 *
 * The icon names the lamp it will turn *on*, not the one currently lit, so the
 * button is never ambiguous. The two glyphs cross-fade and turn on their
 * shared axis: the flip itself already crossfades the whole frame, and this
 * keeps the control in step with it.
 */
export function ThemeToggle({
  // the board reads this in a glass pill of its own, the library screen wears
  // the pill itself — so the shell is the caller's to choose
  className = 'grid h-8 w-8 place-items-center rounded-lg text-fg-dim transition-colors hover:bg-hover hover:text-fg',
}: {
  className?: string
} = {}) {
  const { theme, toggle } = useTheme()
  const to = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      onClick={toggle}
      // the tooltip names the lamp it will turn on, same as the label — it used
      // to be hardcoded to "light", so it lied on a light board
      title={`Switch to the ${to} board — T`}
      aria-label={`Switch to the ${to} board`}
      className={className}
    >
      <span className="relative block h-3.5 w-3.5">
        <IconSun
          className={`absolute inset-0 h-3.5 w-3.5 transition-all duration-300 ease-out ${
            theme === 'dark' ? 'scale-100 rotate-0 opacity-100' : 'scale-50 -rotate-90 opacity-0'
          }`}
        />
        <IconMoon
          className={`absolute inset-0 h-3.5 w-3.5 transition-all duration-300 ease-out ${
            theme === 'light' ? 'scale-100 rotate-0 opacity-100' : 'scale-50 rotate-90 opacity-0'
          }`}
        />
      </span>
    </button>
  )
}

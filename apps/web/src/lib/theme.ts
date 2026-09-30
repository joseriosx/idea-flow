/**
 * Light / dark, decided before the first paint.
 *
 * The board is a drafting table seen under two lamps: near-black with pale
 * dots at night, paper-white with dark ones by day. Everything downstream reads
 * the theme from a single `data-theme` attribute on <html>, so switching modes
 * never re-renders the graph — it just re-points the custom properties.
 *
 * This module is deliberately framework-free because `index.html` inlines the
 * same three rules ahead of the bundle: a board that painted the wrong lamp and
 * then corrected itself would be worse than a slow one.
 */

export type Theme = 'light' | 'dark'

export const THEME_KEY = 'idea-flow.theme'

/**
 * An explicit choice always wins; otherwise default to light — the white,
 * dotted drafting board the product asks for, regardless of the OS setting.
 */
export function readTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  try {
    const saved = window.localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* private mode: the choice simply does not outlive the visit */
  }
  return 'light'
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
}

export function saveTheme(theme: Theme): void {
  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* nothing to do — the board still switches, it just will not remember */
  }
}

export const otherTheme = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark')

import { useEffect, useState } from 'react'

const KEY = 'idea-flow.seen.v1'
const LIFETIME_MS = 11000

/**
 * A three-line welcome, once per browser.
 *
 * The board is legible but not self-explanatory — especially the arrow
 * direction — so the first visit gets a short brief that gets out of the way
 * on its own and never returns.
 */
export function FirstRun() {
  const [open, setOpen] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(KEY) !== 'yes'
  })

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    const timer = setTimeout(close, LIFETIME_MS)
    window.addEventListener('keydown', close, { once: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', close)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, 'yes')
      } catch {
        /* private mode: the card simply shows again next time */
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [open])

  if (!open) return null

  return (
    <div className="anim-rise absolute bottom-[4.75rem] left-1/2 z-20 w-[21rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 max-md:bottom-[8.5rem]">
      <div className="hud rounded-2xl p-4">
        <p className="label">start here</p>
        <ul className="mt-2.5 space-y-1.5 text-[12px] font-normal leading-[1.5] text-fg-mid">
          <li>
            <span className="micro text-fg-faint">01</span> Add a card from the left, or press{' '}
            <span className="kbd">I</span> <span className="kbd">Q</span>{' '}
            <span className="kbd">E</span>.
          </li>
          <li>
            <span className="micro text-fg-faint">02</span> Drag between the two dots on two cards to say how
            they relate. Hold <span className="kbd">shift</span> to invert it.
          </li>
          <li>
            <span className="micro text-fg-faint">03</span> Click a line to change or remove it. Double-click
            a card to rename it in place.
          </li>
        </ul>
      </div>
    </div>
  )
}

import { useEffect } from 'react'

import { useTheme } from '../../hooks/useTheme'
import { API_BASE } from '../../lib/api'
import { ThemeToggle } from '../chrome/ThemeToggle'
import { Library } from './Library'
import { LogoPlate } from './LogoPlate'

/* ==========================================================================
   The library screen

   The board is a drafting table; this is the same table with the drawing taken
   off it. Everything here is borrowed rather than invented: the same dotted
   field and rules, the same paper and lift, the same `micro` voice, the same
   two lamps. The only thing that changes is that there is no graph in the
   middle — so the mark and the name take the space the cards would occupy, set
   on one baseline like a masthead rather than stacked in the middle of the
   screen.

   It is the first thing painted, and it is where the app opens every time: the
   nav store is not persisted on purpose.
   ========================================================================== */

export function Home() {
  const { toggle } = useTheme()

  // The board binds `T` itself, but the board is not mounted here — so without
  // this the lamp would be the one control the library screen could not reach.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== 't') return
      const el = event.target instanceof HTMLElement ? event.target : null
      if (el?.isContentEditable || el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA') return
      event.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [toggle])

  return (
    <div className="surface thin-scroll relative h-full w-full overflow-y-auto overflow-x-hidden">
      <div className="field" />
      <div className="grain" />
      <div className="vignette" />

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[62rem] flex-col px-6 py-7 sm:px-9 sm:py-9">
        <div className="flex justify-end">
          <ThemeToggle
            className="hud anim-rise grid h-9 w-9 place-items-center rounded-full text-fg-dim transition-colors hover:bg-hover hover:text-fg"
          />
        </div>

        <Hero />

        <Library />

        <footer className="anim-rise mt-auto pt-14" style={{ animationDelay: '440ms' }}>
          <div className="hairline" />
          <div className="mt-3.5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1.5">
            <p className="micro text-fg-faint">local-first · your board never leaves this device</p>
            <p className="micro text-fg-faint">
              {API_BASE ? `api · ${API_BASE}` : 'api · not configured'}
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}

/**
 * Mark and name share a baseline, as a masthead does. Deliberately not centred:
 * the library below is a left-aligned grid, and a centred hero over a left grid
 * reads as two unrelated screens stacked in one window.
 */
function Hero() {
  return (
    <header className="anim-rise mt-14 sm:mt-20" style={{ animationDelay: '90ms' }}>
      {/* stacked on a narrow screen so the name gets the full measure, set on
          one baseline from `sm` up — a masthead needs width to be a masthead */}
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:flex-wrap sm:items-end sm:gap-x-7">
        <LogoPlate size={88} />

        <div className="min-w-0 flex-1">
          <h1 className="text-[2.6rem] leading-[0.92] font-bold tracking-[-0.035em] text-fg sm:text-[3.35rem]">
            Idea Flow
          </h1>
          <p className="mt-3.5 max-w-[27rem] text-[13px] leading-[1.6] text-fg-dim">
            A canvas for the ideas you have, the questions behind them, and the
            evidence underneath. Open a project to start arranging.
          </p>
        </div>
      </div>

      <div className="hairline mt-8" />

      {/* the only colour on this screen that is not the paper: the three kinds
          the canvas speaks in, named once so the first board needs no briefing */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="micro text-fg-faint">three kinds</span>
        <Kind label="idea" color="var(--color-idea)" />
        <Kind label="question" color="var(--color-question)" />
        <Kind label="evidence" color="var(--color-evidence)" />
      </div>
    </header>
  )
}

function Kind({ label, color }: { label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="h-[7px] w-[7px] rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      <span className="micro text-fg-dim">{label}</span>
    </span>
  )
}

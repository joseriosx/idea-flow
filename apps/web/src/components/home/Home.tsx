import { useCallback, useEffect, useState } from 'react'

import { useTheme } from '../../hooks/useTheme'
import { ThemeToggle } from '../chrome/ThemeToggle'
import { CreateModal } from './CreateModal'
import { Hero } from './Hero'
import { Library } from './Library'
import { LogoPlate } from './LogoPlate'

/* ==========================================================================
   The landing screen

   Two rooms behind one door: a hero that says what the tool is, and the library
   that says what you already have. The pill at the top moves between them and
   the canvas is a third, separate screen — the nav store owns "home or board",
   and this component owns which room of the home you are standing in.

   That is deliberate. The project list is presentational: it does not change
   which board the canvas is showing, does not need to survive a reload, and
   should not push a second concern into the store that already decides where the
   app opens. So the mode is local, and the store stays about screens.

   The concept is drawn in daylight only. The room is the same in both themes —
   the wash, the orbs, the glass and the preview board all take `--hf-*` tokens,
   so dark is the same place at night rather than a second design.

   The home is also the first thing painted and where the app always opens; the
   nav store is not persisted on purpose.
   ========================================================================== */

type HomeMode = 'create' | 'library'

export function Home() {
  const { toggle } = useTheme()
  const [mode, setMode] = useState<HomeMode>('create')
  const [creating, setCreating] = useState(false)

  const openCreate = useCallback(() => setCreating(true), [])
  const closeCreate = useCallback(() => setCreating(false), [])
  // A new board is only visible in the library, so a reader who created one from
  // the hero would otherwise be left looking at the hero, wondering if it worked.
  const showLibrary = useCallback(() => {
    setCreating(false)
    setMode('library')
  }, [])

  // The board binds `T` itself, but the board is not mounted here — so without
  // this the lamp would be the one control the home could not reach.
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
    <>
      <div
        className="thin-scroll relative h-full w-full overflow-x-hidden overflow-y-auto"
        // the wash starts on the scroll container too, so overscroll never shows
        // the board's flat canvas behind the pastel
        style={{ background: 'var(--hf-tint)' }}
      >
        <div className="hf-page min-h-full">
          <div className="hf-grain" />
          <div className="hf-orb hf-orb-a" />
          <div className="hf-orb hf-orb-b" />
          <div className="hf-orb hf-orb-c" />

          <HomeHeader mode={mode} onMode={setMode} />

          {mode === 'create' ? (
            <Hero onCreate={openCreate} />
          ) : (
            <Library onCreate={openCreate} />
          )}
        </div>
      </div>

      {/* the dialog is fixed, so it lives outside the scroll container rather
          than being clipped by it */}
      <CreateModal open={creating} onClose={closeCreate} onCreated={showLibrary} />
    </>
  )
}

function HomeHeader({
  mode,
  onMode,
}: {
  mode: HomeMode
  onMode: (mode: HomeMode) => void
}) {
  return (
    <header className="hf-header">
      {/* the real mark, on its white plate — the concept's CSS mark is a stand-in
          and the app already has the artwork */}
      <button
        type="button"
        onClick={() => onMode('create')}
        title="Idea Flow — home"
        className="hf-brand"
      >
        <LogoPlate size={42} />
        <span className="hf-name">Idea Flow</span>
      </button>

      <nav className="hf-pill" aria-label="Home mode">
        <button
          type="button"
          aria-pressed={mode === 'create'}
          className={mode === 'create' ? 'is-active' : ''}
          onClick={() => onMode('create')}
        >
          Create
        </button>
        <button
          type="button"
          aria-pressed={mode === 'library'}
          className={mode === 'library' ? 'is-active' : ''}
          onClick={() => onMode('library')}
        >
          Library
        </button>
      </nav>

      <div className="hf-actions">
        {/* two honest placeholders and the one control that has to work: the
            lamp. Nothing is invented for help or profile */}
        <button type="button" className="hf-round" title="Help — coming soon" aria-label="Help — coming soon">
          ?
        </button>

        <ThemeToggle className="hf-round" />

        <button
          type="button"
          className="hf-round"
          title="Profile — coming soon"
          aria-label="Profile — coming soon"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M5.5 19c.8-3.5 3-5.2 6.5-5.2s5.7 1.7 6.5 5.2"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </header>
  )
}

import { useCallback, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'

import { applyTheme, otherTheme, readTheme, saveTheme, type Theme } from '../lib/theme'

/** `startViewTransition` is in shipping browsers but not in every lib.dom yet. */
type Transitional = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/* ==========================================================================
   One theme, many readers

   The theme lives in the module rather than in a component's state because more
   than one component needs to *read* it — the toggle in the board chrome, the
   toggle on the library screen, and the `T` shortcut that must stay in step
   with both. With a local `useState` per call they drift the moment any one of
   them writes: the `T` key flips the document, the button keeps rendering the
   old lamp, and clicking it then computes "the theme I last saw", which is the
   one already on screen — so the button stops responding.

   `useSyncExternalStore` is exactly this shape: one snapshot, every subscriber
   re-renders together, and a late subscriber reads the current value rather
   than the one it was created with.
   ========================================================================== */

let snapshot: Theme = readTheme()
const readers = new Set<() => void>()

function subscribe(onChange: () => void): () => void {
  readers.add(onChange)
  return () => {
    readers.delete(onChange)
  }
}

const getSnapshot = (): Theme => snapshot

function write(next: Theme): void {
  if (next === snapshot) return
  snapshot = next
  applyTheme(next)
  saveTheme(next)
  for (const onChange of readers) onChange()
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

  const toggle = useCallback(() => {
    const next = otherTheme(getSnapshot())

    // The swap is written by hand rather than left to a render so it lands
    // inside the view transition's callback: without `flushSync` React would
    // defer the commit past the snapshot and the crossfade would capture the
    // old board twice.
    const swap = () => write(next)

    const doc = document as Transitional
    if (doc.startViewTransition && !prefersReducedMotion()) {
      doc.startViewTransition(() => flushSync(swap))
    } else {
      swap()
    }
  }, [])

  return { theme, toggle }
}

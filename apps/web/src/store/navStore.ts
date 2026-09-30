import { create } from 'zustand'

import { DEFAULT_BOARD_ID } from '../lib/api'

/* ==========================================================================
   Where the app is

   Two screens, no router: a library to pick from and a canvas to work in. This
   is deliberately its own store and deliberately not persisted — the ask was
   that the app *opens* on the library, every time, so remembering the last
   board would contradict it. The canvas store keeps the drawing; this only
   remembers which door you walked through.
   ========================================================================== */

export type View = 'home' | 'board'

type NavStore = {
  view: View
  /** which board the canvas is showing, by api id */
  boardId: string
  openBoard: (id: string) => void
  goHome: () => void
}

export const useNavStore = create<NavStore>()((set) => ({
  view: 'home',
  boardId: DEFAULT_BOARD_ID,
  openBoard: (id) => set({ view: 'board', boardId: id }),
  goHome: () => set({ view: 'home' }),
}))

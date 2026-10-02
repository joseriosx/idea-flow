import { useEffect, useRef } from 'react'

import { DEFAULT_BOARD_ID } from '../lib/api'
import { seedGraph, useFlowStore } from '../store/flowStore'
import { useLocalBoards, type LocalGraph } from '../store/localBoardStore'
import { useNavStore } from '../store/navStore'

/* ==========================================================================
   One drawing per board

   The canvas keeps one board at a time, so opening a second one used to mean
   losing the first: `flowStore` held a single graph, and switching boards
   overwrote it. With boards kept on this device, that is no longer acceptable —
   a board you made would take the seed board's drawing with it.

   So the canvas becomes a window rather than the storage. On the way in, a
   board's drawing is saved to the local registry; on the way out, the board
   being left is remembered and the one being opened is put on the canvas. That
   is the whole mechanism, and it is why a board comes back the way it was left.

   Two rules the seed board keeps, unchanged:

   - It is never fetched. `useBoardLoader` still returns before any request, so
     opening it can never replace what is drawn with a fresh copy from the api —
     which is what would throw away the reader's work on every trip home and back.
   - It is never *blanked*. It arrives here with its drawing already on the
     canvas from `flowStore`, which persists it. So on the very first open there
     is nothing saved and nothing to load, and that is correct: what is drawn is
     what the reader has. Only once they leave does the registry begin keeping a
     copy — and a board with no copy loads blank, because a new board is blank
     and copying the seed into it would be inventing content the reader never made.

   The padlock is none of this hook's business. It governs the *list* — whether a
   board may be renamed or deleted — and a locked board is still perfectly openable
   and still perfectly editable on the canvas. Freezing a board in the gallery is
   a way of tidying the shelf, not of fencing the reader out of their own thinking.

   Writes are debounced because a drag fires `nodes`/`edges` on every frame, and
   localStorage on every frame is a stall the reader can feel. The last one is
   always flushed, though: leaving a board — or the whole screen — before the
   timer fires must not cost the reader the change they just made.
   ========================================================================== */

const SAVE_AFTER_MS = 600

const EMPTY: LocalGraph = { nodes: [], edges: [] }

/**
 * Read through `getState` rather than through the effect's closure, so what is
 * flushed is the canvas as it stands at the moment of leaving — not whatever the
 * last render happened to capture.
 */
function flush(owner: React.RefObject<string | null>) {
  const id = owner.current
  if (id === null) return
  const { nodes, edges } = useFlowStore.getState()
  useLocalBoards.getState().saveGraph(id, { nodes, edges })
}

export function useLocalBoardGraph() {
  const boardId = useNavStore((s) => s.boardId)
  const applyGraph = useFlowStore((s) => s.applyGraph)
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)

  // a subscription to the whole list would redraw the canvas on every keystroke
  // in the library; a boolean does not, and that is all this needs to know
  const isLocal = useLocalBoards((s) => s.boards.some((b) => b.id === boardId))
  const saveGraph = useLocalBoards((s) => s.saveGraph)

  /** the board the canvas is currently recording for */
  const owner = useRef<string | null>(null)

  /* switching boards: what is drawn belongs to the one being left, and the one
     being opened comes back from wherever it was last put down */
  useEffect(() => {
    flush(owner)
    owner.current = null

    if (!isLocal) return

    owner.current = boardId
    const { graphs } = useLocalBoards.getState()
    const saved = graphs[boardId]

    /* The seed board's drawing lives in `flowStore`, and that is the arrangement
       the project protects: it is persisted, it is never fetched from the api,
       and the reader edits it. "The canvas holds the seed" is only true while
       nothing else has been opened — the canvas holds one board at a time, so
       the first blank board the reader makes replaces it.

       So the seed is *adopted* rather than left to chance, and it is adopted
       FROM THE SEED, not from the canvas. Adoption used to happen here by
       flushing whatever was drawn, and that was wrong twice over: the canvas
       holds one board at a time, so a reader who opened a blank board before
       ever opening the demo had already replaced the seed — and then that
       board's empty canvas was written over the seed as the demo's drawing,
       and it was gone for good. Taking the copy from `seedGraph` instead makes
       the demo's content independent of the order the reader clicked things in,
       while still inventing nothing: it is the very drawing the app opens with.

       Note what is deliberately *not* done here: the reader's own work on the
       demo is not thrown away. Leaving a board already flushes the canvas into
       it, so by the time the demo has a copy in the registry, that copy is
       theirs — and a demo that has one is loaded from it like any other board.
       Only the very first arrival, with no copy anywhere, falls back to the
       seed. */
    if (boardId === DEFAULT_BOARD_ID && !saved) {
      const seed = seedGraph()
      applyGraph(seed)
      saveGraph(boardId, seed)
      return
    }

    applyGraph(saved ?? EMPTY)
  }, [applyGraph, boardId, isLocal, saveGraph])

  /* leaving the screen entirely must not strand the last edit */
  useEffect(() => () => flush(owner), [])

  /* save on visibility change and pagehide to avoid data loss */
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush(owner)
      }
    }

    const handlePageHide = () => {
      flush(owner)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [])

  /* save: a beat after the drawing settles */
  useEffect(() => {
    if (owner.current === null) return
    const id = owner.current
    const timer = setTimeout(() => saveGraph(id, { nodes, edges }), SAVE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [edges, nodes, saveGraph])
}
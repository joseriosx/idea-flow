import { useEffect } from 'react'
import { useReactFlow, ReactFlowProvider } from '@xyflow/react'

import { Canvas } from './components/Canvas'
import { Chrome } from './components/Chrome'
import { Home } from './components/home/Home'
import { useShortcuts } from './hooks/useShortcuts'
import { useLocalBoardGraph } from './hooks/useLocalBoardGraph'
import { DEFAULT_BOARD_ID, fetchBoard } from './lib/api'
import { cleanupLegacyCanvas } from './lib/cleanupCanvas'
import { useFlowStore } from './store/flowStore'
import { useLocalBoards } from './store/localBoardStore'
import { useNavStore } from './store/navStore'

function Board() {
  useShortcuts()
  useBoardLoader()
  useLocalBoardGraph()

  return (
    <div className="surface relative h-full w-full overflow-hidden">
      <Canvas />

      {/* atmosphere: both layers ignore the pointer, so the canvas is untouched */}
      <div className="grain" />
      <div className="vignette" />

      <Chrome />
    </div>
  )
}

/**
 * Load the board that was picked in the library.
 *
 * The demo board is deliberately exempt. It is the board the app works on, it
 * is persisted in localStorage, and it is edited — so opening it must never
 * quietly replace what is on the canvas with a fresh copy from the api, which
 * would throw away the reader's work on every trip to the library and back.
 * That board is loaded the way it always has been: the import control in the
 * chrome, or `R` for the seed.
 *
 * Any *other* board falls into one of two cases, and only one of them is worth a
 * request:
 *
 * - It is a board kept on this device. It has no copy on the server, so asking
 *   for one can only ever 404 — and its drawing is already here, in
 *   `useLocalBoardGraph`. This is what makes a board created in the library
 *   openable at all.
 * - Otherwise it really is the api's, so there is nothing to lose and the api is
 *   the only place it can come from. A failure there leaves whatever was already
 *   drawn alone and says why.
 */
function useBoardLoader() {
  const boardId = useNavStore((s) => s.boardId)
  const applyGraph = useFlowStore((s) => s.applyGraph)
  const notify = useFlowStore((s) => s.notify)
  const { fitView } = useReactFlow()

  useEffect(() => {
    if (boardId === DEFAULT_BOARD_ID) return

    // read through `getState` on purpose: subscribing here would put the api
    // fetch in the same render as a rename in the library, for no gain
    if (useLocalBoards.getState().boards.some((b) => b.id === boardId)) return

    let alive = true
    void (async () => {
      const result = await fetchBoard(boardId)
      if (!alive) return

      if (!result.ok) {
        notify(`could not open “${boardId}” — ${result.detail}`, 'warn')
        return
      }
      if (!result.graph) {
        notify(`“${result.board.name}” has no graph yet`, 'warn')
        return
      }

      applyGraph(result.graph)
      requestAnimationFrame(() => {
        void fitView({ padding: 0.16, duration: 460, maxZoom: 1 })
      })
    })()

    return () => {
      alive = false
    }
  }, [applyGraph, boardId, fitView, notify])
}

/**
 * Two screens, one door between them.
 *
 * The provider wraps only the board: the library screen has no flow instance to
 * give, and mounting one would initialise a graph engine that is never used.
 */
export default function App() {
  const view = useNavStore((s) => s.view)

  useEffect(() => {
    cleanupLegacyCanvas()
  }, [])

  if (view === 'home') return <Home />

  return (
    <ReactFlowProvider>
      <Board />
    </ReactFlowProvider>
  )
}

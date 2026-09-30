import { useCallback, useEffect, useState } from 'react'

import { API_CONFIGURED, fetchBoards, type BoardSummary } from '../lib/api'

/* ==========================================================================
   The project list behind the library

   `failed` is not an error state to escape from, it is a state to draw: the api
   is optional, so the screen is built to look finished in all three of them.
   `ready` with nothing in it is the empty state, which the component decides
   rather than a fourth phase it could disagree with.
   ========================================================================== */

export type BoardsPhase = 'loading' | 'ready' | 'failed'

export function useBoards() {
  const [phase, setPhase] = useState<BoardsPhase>('loading')
  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [detail, setDetail] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!API_CONFIGURED) {
      setPhase('failed')
      setDetail('no api configured')
      return
    }

    // the result may land after the screen is gone, and setting state on an
    // unmounted component is the one way this hook could still be wrong
    let alive = true
    setPhase('loading')

    void fetchBoards().then((result) => {
      if (!alive) return
      if (result.ok) {
        setBoards(result.boards)
        setDetail('')
        setPhase('ready')
      } else {
        setBoards([])
        setDetail(result.detail)
        setPhase('failed')
      }
    })

    return () => {
      alive = false
    }
  }, [attempt])

  const reload = useCallback(() => setAttempt((n) => n + 1), [])

  return { phase, boards, detail, reload, configured: API_CONFIGURED }
}

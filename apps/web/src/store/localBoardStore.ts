import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_BOARD_ID } from '../lib/api'
import type { IdeaNode, RelationEdge } from '../types'

export type LocalBoard = {
  id: string
  name: string
  description: string
  locked: boolean
}

export type LocalGraph = { nodes: IdeaNode[]; edges: RelationEdge[] }

type LocalBoardsState = {
  boards: LocalBoard[]
  graphs: Record<string, LocalGraph>
  create: (b: LocalBoard) => void
  update: (id: string, patch: Partial<LocalBoard>) => void
  remove: (id: string) => void
  rename: (id: string, name: string) => void
  setLocked: (id: string, locked: boolean) => void
  saveGraph: (id: string, graph: LocalGraph) => void
  loadGraph: (id: string) => LocalGraph | undefined
}

const seedBoards: LocalBoard[] = []
const seedGraphs: Record<string, LocalGraph> = {}

const isDemoId = (id: unknown): boolean => {
  if (typeof id !== 'string') return false
  return id.toLowerCase() === DEFAULT_BOARD_ID.toLowerCase()
}

export const useLocalBoards = create<LocalBoardsState>()(
  persist(
    (set, get) => ({
      boards: seedBoards,
      graphs: seedGraphs,
      create: (b) => {
        if (isDemoId(b.id)) return
        const boards = get().boards
        if (boards.some((x) => x.id === b.id)) return
        set({ boards: [...boards, b] })
      },
      update: (id, patch) => {
        if (isDemoId(id)) return
        set((s) => ({
          boards: s.boards.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        }))
      },
      remove: (id) => {
        if (isDemoId(id)) return
        set((s) => ({
          boards: s.boards.filter((b) => b.id !== id),
          graphs: Object.fromEntries(
            Object.entries(s.graphs).filter(([k]) => k !== id),
          ),
        }))
      },
      rename: (id, name) => {
        if (isDemoId(id)) return
        const b = get().boards.find((x) => x.id === id)
        if (!b || b.locked) return
        set((s) => ({
          boards: s.boards.map((x) => (x.id === id ? { ...x, name } : x)),
        }))
      },
      setLocked: (id, locked) => {
        if (isDemoId(id)) return
        set((s) => ({
          boards: s.boards.map((x) => (x.id === id ? { ...x, locked } : x)),
        }))
      },
      saveGraph: (id, graph) => {
        if (isDemoId(id)) return
        set((s) => ({ graphs: { ...s.graphs, [id]: graph } }))
      },
      loadGraph: (id) => {
        if (isDemoId(id)) return undefined
        return get().graphs[id]
      },
    }),
    {
      name: 'idea-flow.local-boards.v1',
      version: 3,
      migrate: (state: any) => {
        let boards: LocalBoard[] = Array.isArray(state?.boards)
          ? (state.boards as LocalBoard[])
          : []

        let graphs: Record<string, LocalGraph> = state?.graphs && typeof state.graphs === 'object'
          ? (state.graphs as Record<string, LocalGraph>)
          : {}

        // Nunca permitir Demo como board local (case-insensitive)
        boards = boards.filter((b) => !isDemoId(b.id))
        graphs = Object.fromEntries(
          Object.entries(graphs).filter(([k]) => !isDemoId(k)),
        )

        return { boards, graphs }
      },
    },
  ),
)

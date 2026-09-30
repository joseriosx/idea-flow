import { useBoards } from '../../hooks/useBoards'
import { DEFAULT_BOARD_ID, type BoardSummary } from '../../lib/api'
import { useNavStore } from '../../store/navStore'
import { IconArrow, IconPlus } from '../icons'

/* ==========================================================================
   The library

   A tray of the boards this app knows about. Three things had to be true at
   once and they shaped every decision below:

   1. It is never a dead end. The api is optional, so "no boards" and "the api
      is down" both still have to leave the reader with something to open — the
      on-device board is always offered, plainly labelled as being on the
      device, because it *is* on the device.
   2. It never invents. There is no create endpoint in this api, so the "new
      project" tile says so out loud instead of pretending. A disabled control
      that explains itself is honest; one that silently does nothing is a bug
      report waiting to happen.
   3. It is made of the same stuff as the canvas. Paper cards, micro labels,
      the accent that belongs to an idea — so moving between the two screens
      feels like moving between two rooms, not two products.
   ========================================================================== */

/** The board that lives in localStorage, whether or not an api ever answers. */
const ON_DEVICE: BoardSummary = {
  id: DEFAULT_BOARD_ID,
  name: 'Demo board',
  description:
    'Seeded on this device. The repair-club argument, ready to rearrange — it works with the api switched off entirely.',
  updatedAt: null,
}

function when(iso: string | null): string | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function Library() {
  const { phase, boards, detail, reload, configured } = useBoards()
  const openBoard = useNavStore((s) => s.openBoard)

  // While loading there is nothing true to show yet; while the api is down the
  // on-device board is the honest answer, and it is a real card, not a message.
  //
  // Where a board came from is carried explicitly rather than inferred from its
  // id: the api's demo board and the on-device one share the id `demo`, so
  // keying off the id would label the api's card "on this device" — true of the
  // device, misleading about the card.
  const entries: { board: BoardSummary; onDevice: boolean }[] =
    phase === 'ready'
      ? boards.map((board) => ({ board, onDevice: false }))
      : phase === 'failed'
        ? [{ board: ON_DEVICE, onDevice: true }]
        : []
  const empty = phase === 'ready' && boards.length === 0

  const status =
    phase === 'loading'
      ? 'looking'
      : phase === 'failed'
        ? configured
          ? 'api unreachable'
          : 'on this device only'
        : boards.length === 0
          ? 'empty'
          : `${boards.length} ${boards.length === 1 ? 'project' : 'projects'}`

  return (
    <section className="anim-rise mt-12 sm:mt-16" style={{ animationDelay: '300ms' }}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="label">projects</h2>
        <span className="micro text-fg-faint">{status}</span>
      </div>

      {phase === 'failed' && (
        <Notice detail={detail} configured={configured} onRetry={reload} />
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {phase === 'loading' &&
          [0, 1, 2].map((i) => <Skeleton key={i} />)}

        {entries.map(({ board, onDevice }, index) => (
          <BoardCard
            key={board.id}
            board={board}
            onDevice={onDevice}
            delay={360 + index * 70}
            onOpen={() => openBoard(board.id)}
          />
        ))}

        {/* a board always exists to open, so the empty tray is never a corner */}
        {empty && (
          <div className="anim-rise col-span-full" style={{ animationDelay: '340ms' }}>
            <p className="text-[13px] leading-[1.55] text-fg-dim">
              Nothing here yet — the api is answering, and it has no boards to
              show.
            </p>
            <button
              type="button"
              onClick={() => openBoard(DEFAULT_BOARD_ID)}
              className="group mt-3 inline-flex items-center gap-2 text-[12.5px] text-fg-mid transition-colors hover:text-fg"
            >
              Open the board kept on this device
              <IconArrow className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
            </button>
          </div>
        )}

        {/* the tile promises a create endpoint, so it has no business showing
            while the api that would have to serve one is not answering */}
        {phase === 'ready' && <NewProjectTile />}
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------------
   states
   -------------------------------------------------------------------------- */

/**
 * The reason a failed fetch is here is worth having and not worth *reading*, so
 * it lives in the title rather than the sentence: the headline says what
 * happened, the body says what it costs the reader (nothing), and the technical
 * detail is one hover away when it is actually wanted.
 */
function Notice({
  detail,
  configured,
  onRetry,
}: {
  detail: string
  configured: boolean
  onRetry: () => void
}) {
  return (
    <div
      className="hud anim-rise mt-4 flex items-start gap-3.5 rounded-2xl px-4 py-3.5"
      title={configured ? `the api did not answer — ${detail}` : detail}
    >
      <span
        className="mt-[5px] h-2 w-2 shrink-0 rounded-full"
        style={{
          background: 'var(--color-idea)',
          boxShadow: '0 0 10px var(--color-idea)',
        }}
      />
      <div className="min-w-0 flex-1">
        <p className="micro text-fg-mid">
          {configured ? 'the api did not answer' : 'no api configured'}
        </p>
        <p className="mt-1.5 text-[12px] leading-[1.55] text-fg-dim">
          {configured
            ? 'Nothing is lost — the board below lives on this device. The api may still be starting.'
            : 'The board below lives on this device and works with the api switched off entirely. Set VITE_API_URL and rebuild to see your projects here.'}
        </p>
      </div>
      {configured && (
        <button
          type="button"
          onClick={onRetry}
          className="micro shrink-0 rounded-full border border-line px-3 py-2 text-fg-mid transition-colors hover:bg-hover hover:text-fg"
        >
          retry
        </button>
      )}
    </div>
  )
}

/** Matches the real card's box so the grid never jumps when the data lands. */
function Skeleton() {
  return (
    <div
      className="min-h-[13.25rem] animate-pulse rounded-[0.875rem] border border-card-line bg-paper"
      style={{ boxShadow: 'var(--elev-lift)' }}
    >
      <div className="flex flex-col gap-2.5 px-4 pb-4 pt-4">
        <div className="h-2 w-16 rounded-full bg-paper-600/25" />
        <div className="h-3.5 w-2/3 rounded-full bg-paper-600/25" />
        <div className="h-2.5 w-full rounded-full bg-paper-600/15" />
        <div className="h-2.5 w-4/5 rounded-full bg-paper-600/15" />
      </div>
    </div>
  )
}

function NewProjectTile() {
  return (
    <button
      type="button"
      disabled
      title="There is no create endpoint in the api yet, so this cannot be pressed. The Demo board is the only project it serves today."
      className="flex min-h-[13.25rem] w-full cursor-not-allowed flex-col items-center justify-center gap-2.5 rounded-[0.875rem] border-[1.5px] border-dashed border-line-hi px-4 text-center"
    >
      <span className="grid h-9 w-9 place-items-center rounded-full border border-dashed border-line-hi text-fg-faint">
        <IconPlus className="h-3.5 w-3.5" />
      </span>
      <span className="micro text-fg-dim">new project</span>
      <span className="max-w-[12rem] text-[11px] leading-[1.45] text-fg-faint">
        The api has no create endpoint yet.
      </span>
    </button>
  )
}

/* --------------------------------------------------------------------------
   a board
   -------------------------------------------------------------------------- */

function BoardCard({
  board,
  onDevice,
  delay,
  onOpen,
}: {
  board: BoardSummary
  onDevice: boolean
  delay: number
  onOpen: () => void
}) {
  const stamp = when(board.updatedAt)
  const meta = onDevice ? 'on this device' : stamp ?? `id · ${board.id}`

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Open ${board.name}`}
      className="lib-card group anim-rise min-h-[13.25rem] px-4 pb-3.5 pt-4"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="micro text-paper-600">{onDevice ? 'on this device' : 'board'}</span>
        <span className="micro text-paper-600/70">{board.id}</span>
      </div>

      <h3 className="mt-3 text-[1.06rem] font-bold leading-[1.2] tracking-[-0.016em]">
        {board.name}
      </h3>
      <p className="mt-1.5 flex-1 text-[12px] leading-[1.5] text-paper-600">
        {board.description || 'No description.'}
      </p>

      {/* a rule printed on paper, so it is a tone of the sheet rather than the
          cool divider the dark board uses */}
      <div className="mt-3.5 h-px w-full bg-paper-200" />

      <div className="mt-2.5 flex items-center justify-between">
        <span className="micro text-paper-600/80">{meta}</span>
        <IconArrow className="h-3 w-3 -translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100" />
      </div>
    </button>
  )
}

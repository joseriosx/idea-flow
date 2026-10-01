import { useBoards } from '../../hooks/useBoards'
import { DEFAULT_BOARD_ID, DEFAULT_BOARD_NAME, type BoardSummary } from '../../lib/api'
import { useNavStore } from '../../store/navStore'
import { IconArrow, IconPlus } from '../icons'

/* ==========================================================================
   The library

   A gallery of the boards this app knows about, wearing the concept's clothes:
   a gradient card per project, a number, and a small dotted preview of the map
   inside. Three rules from before still hold and shaped everything here:

   1. It is never a dead end. The api is optional, so "no boards" and "the api is
      down" both still leave something to open — the on-device board, plainly
      labelled as being on the device, because it *is* on the device.
   2. It never invents. There is no create endpoint, so the new-project tile says
      so out loud and opens a dialog that says it again rather than pretending.
   3. Where a board came from is carried explicitly, not guessed from its id: the
      api's demo board and the on-device one share the id `demo`, so keying off
      the id would label the api's card "on this device".
   ========================================================================== */

/** The board that lives in localStorage, whether or not an api ever answers. */
const ON_DEVICE: BoardSummary = {
  id: DEFAULT_BOARD_ID,
  name: DEFAULT_BOARD_NAME,
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

export function Library({ onCreate }: { onCreate: () => void }) {
  const { phase, boards, detail, reload, configured } = useBoards()
  const openBoard = useNavStore((s) => s.openBoard)

  // While loading there is nothing true to show yet; while the api is down the
  // on-device board is the honest answer, and it is a real card, not a message.
  const entries: { board: BoardSummary; onDevice: boolean }[] =
    phase === 'ready'
      ? boards.map((board) => ({ board, onDevice: false }))
      : phase === 'failed'
        ? [{ board: ON_DEVICE, onDevice: true }]
        : []
  const empty = phase === 'ready' && boards.length === 0

  return (
    <section className="hf-library">
      <div className="hf-lib-head">
        <div>
          <div className="hf-eyebrow">Your workspace</div>
          <h2 className="hf-lib-title">
            PROJECT
            <br />
            LIBRARY
          </h2>
        </div>
        <p>
          Seus mapas ficam aqui. Abra um projeto existente ou crie um novo quadro
          para começar uma linha de raciocínio.
        </p>
      </div>

      {phase === 'failed' && <Notice detail={detail} configured={configured} onRetry={reload} />}

      <div className="hf-gallery">
        {phase === 'loading' && [0, 1, 2].map((i) => <Skeleton key={i} tone={i} />)}

        {entries.map(({ board, onDevice }, index) => (
          <BoardCard
            key={board.id}
            board={board}
            onDevice={onDevice}
            index={index}
            onOpen={() => openBoard(board.id)}
          />
        ))}

        {/* a board always exists to open, so the empty tray is never a corner */}
        {empty && (
          <div className="hf-empty">
            <p>
              Nothing here yet — the api is answering, and it has no boards to
              show.
            </p>
            <button
              type="button"
              onClick={() => openBoard(DEFAULT_BOARD_ID)}
              className="hf-link"
            >
              Open the board kept on this device
              <IconArrow className="hf-link-arrow h-3 w-3" />
            </button>
          </div>
        )}

        {/* the tile promises a create endpoint, so it has no business showing
            while the api that would have to serve one is not answering */}
        {phase === 'ready' && <NewProject onClick={onCreate} />}
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
      className="hf-notice"
      title={configured ? `the api did not answer — ${detail}` : detail}
    >
      <span className="hf-notice-dot" />
      <div className="min-w-0 flex-1">
        <p className="hf-notice-title">
          {configured ? 'the api did not answer' : 'no api configured'}
        </p>
        <p className="hf-notice-body">
          {configured
            ? 'Nothing is lost — the board below lives on this device. The api may still be starting.'
            : 'The board below lives on this device and works with the api switched off entirely. Set VITE_API_URL and rebuild to see your projects here.'}
        </p>
      </div>
      {configured && (
        <button type="button" onClick={onRetry} className="hf-btn hf-btn-ghost hf-retry">
          retry
        </button>
      )}
    </div>
  )
}

/** Keeps the card's box so the gallery never jumps when the data lands. */
function Skeleton({ tone }: { tone: number }) {
  return (
    <div className={`hf-project hf-tone-${tone + 1} hf-skeleton`} aria-hidden="true">
      <div className="hf-bar h-2 w-16" />
      <div className="hf-bar mt-6 h-7 w-2/3" />
      <div className="hf-bar mt-4 h-3 w-4/5" />
    </div>
  )
}

function NewProject({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="New boards need a create endpoint — there is none yet"
      className="hf-new"
    >
      <span className="hf-new-icon">
        <IconPlus className="h-3.5 w-3.5" />
      </span>
      <span className="hf-new-label">new project</span>
      <span className="hf-new-hint">
        Criação ainda não está ligada — a api não tem endpoint para criar quadros.
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
  index,
  onOpen,
}: {
  board: BoardSummary
  onDevice: boolean
  index: number
  onOpen: () => void
}) {
  const tone = (index % 3) + 1
  const stamp = when(board.updatedAt)
  const provenance = onDevice ? 'ON DEVICE' : board.id.toUpperCase()
  const number = `${String(index + 1).padStart(2, '0')} · ${provenance}`

  return (
    <button
      type="button"
      onClick={onOpen}
      title={`Open ${board.name}`}
      className={`hf-project hf-tone-${tone} anim-card`}
      style={{ animationDelay: `${320 + index * 70}ms` }}
    >
      <div className="hf-num-row">
        <span className="hf-num">{number}</span>
        {stamp && <span className="hf-when">{stamp}</span>}
      </div>

      <h3>{board.name}</h3>
      <p>{board.description || 'No description.'}</p>

      <div className="hf-mini" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
    </button>
  )
}

import { useCallback, useRef, useState } from 'react'

import { useBoards } from '../../hooks/useBoards'
import { type BoardSummary } from '../../lib/api'
import { useLocalBoards } from '../../store/localBoardStore'
import { useNavStore } from '../../store/navStore'
import { IconPlus } from '../icons'
import { CardTools, ConfirmDeleteDialog, InlineName } from './BoardActions'

/* ==========================================================================
   The library

   A gallery of the boards this app knows about, wearing the concept's clothes:
   a gradient card per project, a number, and a small dotted preview of the map
   inside. Four rules from before still hold and shaped everything here:

   1. It is never a dead end. Boards kept on this device need no api at all, so
      the new-project tile is shown whatever the api is doing.
   2. It never invents. Nothing here becomes a request unless the api has an
      endpoint for it, and it has none but read.
   3. Where a board came from is carried explicitly, not guessed from its id: the
      api's demo board and the on-device one share the id `demo`, so keying off
      the id would label the api's card "on this device" — and, worse, would let
      a rename meant for this device reach a board that lives on a server.
   4. Actions follow the origin, and then the reader's own lock. A board the api
      serves is read-only because there is no endpoint to write to. A board kept
      on this device renames and deletes against localStorage, and only ever that —
      unless the reader has locked it, which is their choice and says so in
      different words, because it is a choice they can take back.

   Rule 3 also decides that both are drawn when they share an id. They are two
   boards that happen to be called the same thing, and the second one is where
   every rename and delete in this gallery happens — so hiding it would leave the
   reader looking at a read-only card with nothing they can do.

   A locked board still opens. The padlock governs this shelf, not the canvas:
   freezing a card is a way of tidying, not of fencing the reader out of their own
   thinking.
   ========================================================================== */

/** Where a card in the gallery came from — the one fact its actions read. */
type Origin = 'api' | 'device'

type Entry = { board: LibraryCard; origin: Origin }

/**
 * What a card in the gallery needs to draw itself. The api's boards arrive
 * without a padlock — where they live already settles that — and the on-device
 * ones bring theirs, so a locked board is locked because the store says so.
 */
type LibraryCard = BoardSummary & { locked?: boolean }

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
  const localBoards = useLocalBoards((s) => s.boards)
  const renameLocal = useLocalBoards((s) => s.rename)
  const removeLocal = useLocalBoards((s) => s.remove)
  const setLockedLocal = useLocalBoards((s) => s.setLocked)

  /**
   * One handler for every card, and it is the store that decides. The card only
   * says which board; whether the padlock may move is settled in one place, so
   * the switch can never disagree with the store about what is locked.
   */
  const toggleLock = useCallback(
    (id: string) => {
      const board = useLocalBoards.getState().boards.find((b) => b.id === id)
      if (!board) return
      setLockedLocal(id, !board.locked)
    },
    [setLockedLocal],
  )

  // While loading there is nothing true to show yet; while the api is down the
  // on-device boards are the honest answer, and they are real cards, not messages.
  const apiBoards = phase === 'ready' ? boards : []
  // while the fetch is in flight the api might well be the one serving `demo`,
  // so the skeletons stand alone — nothing is claimed before it is known
  const localCards =
    phase === 'loading'
      ? []
      : localBoards.map((b) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          updatedAt: null,
          // the padlock comes from the store and crosses with the card, so the
          // card cannot paint a lock the store does not hold
          locked: b.locked,
        }))

  /* Both lists are drawn, always, and side by side. They used to be de-duplicated
     by id — the api's demo board and the on-device one share `demo`, so the second
     was dropped to avoid "two cards for one board". But they are not one board:
     they are the same id in two different places, and hiding the local one hid
     every rename and delete the app has. Two cards is the truth. */
  const entries: Entry[] = [
    ...localCards.map((board) => ({ board, origin: 'device' as const })),
    ...apiBoards.map((board) => ({ board, origin: 'api' as const })),
  ]

  // the note stands only when there is genuinely nothing to open
  const note = phase !== 'loading' && entries.length === 0

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

        {entries.map(({ board, origin }, index) => (
          <BoardCard
            key={`${origin}:${board.id}`}
            board={board}
            origin={origin}
            index={index}
            onOpen={() => openBoard(board.id)}
            onRename={renameLocal}
            onDelete={removeLocal}
            onToggleLock={toggleLock}
          />
        ))}

        {/* nothing here means nothing was ever kept on this device — say so, and
            point at the tile that fixes it */}
        {note && <EmptyNote phase={phase} />}

        {/* the tile is local-only work, so it is shown whether or not the api is
            answering — that is the whole point of boards on this device */}
        <NewProject onClick={onCreate} />
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
            ? 'Nothing is lost — the projects below live on this device. The api may still be starting.'
            : 'The projects below live on this device and work with the api switched off entirely. Set VITE_API_URL and rebuild to see your projects here.'}
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

/**
 * What is missing, said in the words of the state that is missing it — and never
 * a corner, because the tile beside it always works and needs no api.
 */
function EmptyNote({ phase }: { phase: 'loading' | 'ready' | 'failed' }) {
  return (
    <div className="hf-empty">
      <p>
        {phase === 'ready'
          ? 'The api is answering and has no boards to show, and nothing has been kept on this device yet.'
          : 'The api is not answering and nothing has been kept on this device yet.'}
      </p>
      <p>A new project below works with the api switched off entirely.</p>
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
      title="New project — kept on this device"
      className="hf-new"
    >
      <span className="hf-new-icon">
        <IconPlus className="h-3.5 w-3.5" />
      </span>
      <span className="hf-new-label">new project</span>
      <span className="hf-new-hint">
        Um quadro em branco, guardado só neste dispositivo.
      </span>
    </button>
  )
}

/* --------------------------------------------------------------------------
   a board
   -------------------------------------------------------------------------- */

/**
 * The card is a box, not a button, because it now has to hold two buttons — and
 * a button inside a button is neither valid nor reachable by keyboard. So the box
 * draws everything, one transparent button covers it to open the board (so a click
 * anywhere still works and the whole card is one tab stop), and the two real
 * controls sit above that overlay.
 */
function BoardCard({
  board,
  origin,
  index,
  onOpen,
  onRename,
  onDelete,
  onToggleLock,
}: {
  board: LibraryCard
  origin: Origin
  index: number
  onOpen: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  onToggleLock: (id: string) => void
}) {
  const tone = (index % 3) + 1
  const stamp = when(board.updatedAt)
  const readOnly = origin === 'api'
  // an api board carries no lock of its own: where it lives already settles that,
// and `=== true` keeps the card honest about a field it does not have
  const locked = origin === 'device' && board.locked === true
  const provenance = readOnly ? board.id.toUpperCase() : locked ? 'ON DEVICE · LOCKED' : 'ON DEVICE'
  const number = `${String(index + 1).padStart(2, '0')} · ${provenance}`

  const toolRef = useRef<HTMLButtonElement>(null)
  const lockRef = useRef<HTMLButtonElement>(null)
  const [editing, setEditing] = useState(false)
  const [confirming, setConfirming] = useState(false)

  /**
   * The controls already refuse these on a board that is read-only or locked.
   * Saying it again here is not redundancy for its own sake: it puts the
   * guarantee in the same place as the write itself, so nothing here can reach a
   * locked board or a server even if the controls change their mind.
   */
  const writable = (fn: () => void) => () => {
    if (readOnly || locked) return
    fn()
  }

  /** An empty name is not a name: the old one stands. */
  const commitName = (draft: string) => {
    const next = draft.trim()
    setEditing(false)
    toolRef.current?.focus()
    if (readOnly || locked || next === '' || next === board.name) return
    onRename(board.id, next)
  }

  const cancelName = () => {
    setEditing(false)
    toolRef.current?.focus()
  }

  return (
    <div
      className={`hf-project hf-tone-${tone} anim-card`}
      // the origin is written into the markup, not implied by the id: the api's
      // demo board and the on-device one are both `demo`, and every consumer —
      // styles, tests, a reader with a screen reader — needs to tell them apart
      data-origin={origin}
      data-board={board.id}
      style={{ animationDelay: `${320 + index * 70}ms` }}
    >
      <div className="hf-num-row">
        <span className="hf-num">{number}</span>
        <span className="hf-tools">
          {stamp && <span className="hf-when">{stamp}</span>}
          <CardTools
            name={board.name}
            origin={origin}
            locked={locked}
            renameRef={toolRef}
            lockRef={lockRef}
            onRename={writable(() => setEditing(true))}
            onDelete={writable(() => setConfirming(true))}
            onToggleLock={() => onToggleLock(board.id)}
          />
        </span>
      </div>

      {editing ? (
        <InlineName
          key={board.id}
          value={board.name}
          label={`Renomear ${board.name}`}
          onCommit={commitName}
          onCancel={cancelName}
        />
      ) : (
        <h3>{board.name}</h3>
      )}
      <p>{board.description || 'No description.'}</p>

      <div className="hf-mini" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>

      {/* the card's own tab stop, sitting over everything it draws */}
      <button type="button" className="hf-open" onClick={onOpen} title={`Open ${board.name}`}>
        <span className="sr-only">Abrir {board.name}</span>
      </button>

      <ConfirmDeleteDialog
        open={confirming}
        name={board.name}
        onCancel={() => {
          setConfirming(false)
          toolRef.current?.focus()
        }}
        onConfirm={() => {
          setConfirming(false)
          if (!readOnly && !locked) onDelete(board.id)
        }}
      />
    </div>
  )
}
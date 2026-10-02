import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, RefObject } from 'react'

import { IconLock, IconPencil, IconTrash, IconUnlock } from '../icons'

/* ==========================================================================
   What a card can do

   Three different cards share one gallery, so the actions have to tell them apart
   before they offer anything:

   - A board that came from `GET /boards` belongs to the api, and the api has no
     endpoint to rename or delete one. Its padlock is closed and there is nothing
     to click: it is a fact about where the board lives. Nothing here ever becomes
     a request, because there is nowhere to send it.
   - A board kept on this device is the app's own, so it renames and deletes
     against localStorage and nothing else. Its padlock is the reader's to work:
     press it and the board holds still, press it again and it does not.
   - A board the reader locked looks read-only for a different reason, and says so
     in different words — because it is a choice they made and can take back, not a
     limitation of the app. This is the distinction the two hints exist to keep.

   Locking governs the *list*, not the canvas: a locked board still opens, and the
   drawing inside it is still editable. It is a way of tidying the shelf.

   These are two icons, not a menu. A dropdown had to live in a portal because a
   card clips its own contents, it needed fixed-position measuring on every
   scroll, it trapped arrow keys, and it hid the only two actions on the card
   behind three dots. Two buttons painted in place need none of that — no portal
   to escape the clip, no positioning to recompute, no focus trap, and both
   actions are visible and reachable from the start instead of appearing.

   Only the confirm dialog is still a portal, and for the original reason: it
   must not be clipped by the scroll container.
   ========================================================================== */

/** Why a board the api serves cannot be written to. It has nothing to do with locking. */
export const READ_ONLY_HINT = 'Somente leitura (sem endpoint de edição na API)'

/** Why a board the reader locked cannot be written to. This one they can undo. */
export const LOCKED_HINT = 'Travado por você — destrave para editar o nome ou apagar'

/**
 * One place decides which of the two applies, so a card cannot be half-locked —
 * a padlock showing next to working buttons is worse than either one on its own.
 */
function blockedBy(origin: 'api' | 'device', locked: boolean): string | null {
  if (origin === 'api') return READ_ONLY_HINT
  if (locked) return LOCKED_HINT
  return null
}

/* --------------------------------------------------------------------------
   the controls
   -------------------------------------------------------------------------- */

export function CardTools({
  name,
  origin,
  locked,
  renameRef,
  lockRef,
  onRename,
  onDelete,
  onToggleLock,
}: {
  name: string
  origin: 'api' | 'device'
  locked: boolean
  renameRef: RefObject<HTMLButtonElement | null>
  lockRef: RefObject<HTMLButtonElement | null>
  onRename: () => void
  onDelete: () => void
  onToggleLock: () => void
}) {
  const blocked = blockedBy(origin, locked)
  // a board the api serves is locked by where it lives, so its padlock is a fact
  // being reported rather than a switch being offered
  const lockIsSwitch = origin === 'device'

  return (
    // the reason lives on the group, because a disabled button does not show its
    // own tooltip in every browser — the group does, over all of it
    <span className="hf-tools-pill" title={blocked ?? undefined}>
      {lockIsSwitch ? (
        <button
          ref={lockRef}
          type="button"
          // an open lock on an unlocked board is an invitation, not a warning: it
          // reads as the switch it is, and stays quiet until touched
          className={`hf-tool is-lock${locked ? ' is-on' : ''}`}
          aria-pressed={locked}
          title={locked ? `Destravar ${name}` : `Travar ${name}`}
          aria-label={locked ? `Destravar ${name}` : `Travar ${name}`}
          onClick={onToggleLock}
        >
          {locked ? <IconLock /> : <IconUnlock />}
        </button>
      ) : (
        <span className="hf-tool is-lock is-on" title={READ_ONLY_HINT}>
          <IconLock />
          {/* nothing here is focusable on a read-only card, so the reason is
              offered to a screen reader rather than left to the icon */}
          <span className="sr-only">{READ_ONLY_HINT}</span>
        </span>
      )}

      <button
        ref={renameRef}
        type="button"
        className="hf-tool"
        disabled={blocked !== null}
        title={blocked ?? `Renomear ${name}`}
        aria-label={blocked ? `Renomear ${name} — ${blocked}` : `Renomear ${name}`}
        onClick={onRename}
      >
        <IconPencil />
      </button>

      <button
        type="button"
        className="hf-tool is-danger"
        disabled={blocked !== null}
        title={blocked ?? `Apagar ${name}`}
        aria-label={blocked ? `Apagar ${name} — ${blocked}` : `Apagar ${name}`}
        onClick={onDelete}
      >
        <IconTrash />
      </button>
    </span>
  )
}

/* --------------------------------------------------------------------------
   renaming, in place
   -------------------------------------------------------------------------- */

export function InlineName({
  value,
  label,
  onCommit,
  onCancel,
}: {
  value: string
  label: string
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(value)
  const fieldRef = useRef<HTMLInputElement>(null)
  // enter, escape and blur can all land on the same gesture; only the first counts
  const settled = useRef(false)

  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.focus()
    // selecting means typing replaces the old name, which is the whole gesture
    field.select()
  }, [])

  const finish = (next: string | null) => {
    if (settled.current) return
    settled.current = true
    if (next === null) onCancel()
    else onCommit(next)
  }

  return (
    <input
      ref={fieldRef}
      className="hf-rename"
      value={draft}
      aria-label={label}
      onChange={(event) => setDraft(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          finish(draft)
          return
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          // so the home's own shortcuts never hear it twice
          event.stopPropagation()
          finish(null)
        }
      }}
      onBlur={() => finish(draft)}
    />
  )
}

/* --------------------------------------------------------------------------
   deleting, out loud
   -------------------------------------------------------------------------- */

export function ConfirmDeleteDialog({
  open,
  name,
  onCancel,
  onConfirm,
}: {
  open: boolean
  name: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onCancel])

  /** two buttons, so tabbing cycles them rather than escaping the dialog */
  const trap = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return
    const focusables = Array.from(
      cardRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [],
    )
    if (focusables.length === 0) return
    const at = focusables.indexOf(document.activeElement as HTMLElement)
    const next = at + (event.shiftKey ? -1 : 1)
    if (next >= 0 && next < focusables.length) return
    event.preventDefault()
    const wrapped = event.shiftKey ? focusables.length - 1 : 0
    focusables[at === -1 ? 0 : wrapped]?.focus()
  }

  if (!open) return null

  return createPortal(
    <div
      className="hf-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hf-delete-title"
      aria-describedby="hf-delete-body"
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel()
      }}
    >
      <div className="hf-modal-card" ref={cardRef} onKeyDown={trap}>
        <h3 id="hf-delete-title">Apagar “{name}”?</h3>
        <p id="hf-delete-body">Esta ação não pode ser desfeita.</p>

        {/* the honest part: what the button actually does, and what it does not */}
        <div className="hf-note">
          <span className="hf-note-dot" />
          <p>
            Some-se da biblioteca <strong>neste dispositivo</strong>. O quadro em si
            continua salvo neste navegador — apagar aqui não toca no que está desenhado.
          </p>
        </div>

        <div className="hf-modal-actions">
          <button
            ref={cancelRef}
            type="button"
            className="hf-btn hf-btn-ghost"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button type="button" className="hf-btn hf-btn-danger" onClick={onConfirm}>
            Apagar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
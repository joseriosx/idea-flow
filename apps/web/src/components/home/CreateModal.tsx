import { useEffect, useRef, useState } from 'react'

import { uid } from '../../lib/ids'
import { useLocalBoards } from '../../store/localBoardStore'

/* ==========================================================================
   Start a new flow

   The api has no create endpoint, so this cannot be a shared project — and it
   does not pretend otherwise. What it makes is a real board on this device:
   an entry in `localBoardStore` with its own drawing, persisted in this browser
   like every other board here.

   That store used to hold exactly one name, because the canvas could only keep
   one drawing. It now keeps a drawing per board, so a second board is just a
   second entry — which is what makes this button work instead of explaining why
   it cannot.

   The seed board keeps its drawing in `flowStore` and stays exempt from
   auto-load; a board made here gets one of its own and loads it like any other.
   ========================================================================== */

export function CreateModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  /** Told when a board exists, so the home can put it in front of the reader. */
  onCreated: () => void
}) {
  const create = useLocalBoards((s) => s.create)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  // the name is what the reader came to type, so it takes the caret
  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => nameRef.current?.focus(), 60)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  // nothing lingers between openings: closing drops whatever was typed
  useEffect(() => {
    if (open) return
    setName('')
    setDescription('')
  }, [open])

  if (!open) return null

  /** a name with nothing in it is not a name, so the button stays off */
  const ready = name.trim() !== ''

  const submit = () => {
    if (!ready) return
    create({ id: uid('board-'), name: name.trim(), description: description.trim(), locked: false })
    onClose()
    onCreated()
  }

  return (
    <div
      className="hf-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hf-create-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="hf-modal-card">
        <h3 id="hf-create-title">Start a new flow</h3>
        <p>
          Crie um quadro em branco. Depois você adiciona ideias, perguntas,
          evidências e as conexões entre elas.
        </p>

        <div className="hf-field">
          <label htmlFor="hf-create-name">Nome do projeto</label>
          <input
            id="hf-create-name"
            ref={nameRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              // the name is what the reader came to type, so enter means "go"
              if (event.key !== 'Enter') return
              event.preventDefault()
              submit()
            }}
            placeholder="Ex.: Novo ecossistema de agentes"
          />
        </div>

        <div className="hf-field">
          <label htmlFor="hf-create-desc">Descrição</label>
          <input
            id="hf-create-desc"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Uma frase curta sobre o que você quer organizar"
          />
        </div>

        {/* honest about where it lands, since the api is the other kind of board */}
        <div className="hf-note">
          <span className="hf-note-dot" />
          <p>
            Fica <strong>só neste dispositivo</strong>. A api não tem endpoint de
            criação, então este quadro não existe para mais ninguém — e ninguém
            mais o vê. Ele abre em branco, com o seu próprio mapa guardado aqui.
          </p>
        </div>

        <div className="hf-modal-actions">
          <button type="button" className="hf-btn hf-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="hf-btn hf-btn-black"
            disabled={!ready}
            title={ready ? 'Criar neste dispositivo' : 'Dê um nome ao projeto para criar'}
            onClick={submit}
          >
            Criar projeto
          </button>
        </div>
      </div>
    </div>
  )
}
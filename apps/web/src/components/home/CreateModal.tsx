import { useEffect, useRef, useState } from 'react'

/* ==========================================================================
   Start a new flow

   The concept draws a create dialog; the app has nothing to create it with.

   The api has no create endpoint, and the canvas persists as a *single* board
   in localStorage — the demo board, which is deliberately exempt from auto-load
   so it is never overwritten. Adding a second local board would mean pulling the
   demo out of the store that is its storage and threading a per-board map
   through persistence: a change to exactly the flow the project protects. That
   is the risky case the brief names, so it is not done.

   What is left is a dialog that does not lie. The fields are real and typeable
   so the shape of the flow is visible, the reason is said out loud, and the
   primary button says no instead of pretending.
   ========================================================================== */

export function CreateModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return

    // the name is what the reader came to type, so it takes the caret
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

        <div className="hf-note">
          <span className="hf-note-dot" />
          <p>
            <strong>Criação ainda não está ligada.</strong> A api não tem um
            endpoint de criação, e este workspace guarda um único quadro no seu
            dispositivo — então estes campos mostram o fluxo, mas nada é salvo.
          </p>
        </div>

        <div className="hf-modal-actions">
          <button type="button" className="hf-btn hf-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="hf-btn hf-btn-black"
            disabled
            title="A api não tem endpoint de criação — nenhum projeto pode ser criado ainda"
          >
            Criar projeto
          </button>
        </div>
      </div>
    </div>
  )
}

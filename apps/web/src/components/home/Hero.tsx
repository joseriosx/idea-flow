import { useEffect, useRef } from 'react'

import { DEFAULT_BOARD_NAME } from '../../lib/api'
import { useFlowStore } from '../../store/flowStore'

/* ==========================================================================
   The hero

   A headline, a preview board catching the light, and two glass cards that
   float beside it. The preview is not a live graph — nobody can pan it — but
   the left card is not decoration either: it reads the real node and edge counts
   off the on-device board, so the one number on this screen that could be a lie
   is the truth instead.

   The board tips towards the pointer. Doing that with state would repaint the
   whole subtree on every mousemove; it is written straight to a transform
   through a ref and a single animation frame instead, so the only thing that
   moves is the board.
   ========================================================================== */

export function Hero({ onCreate }: { onCreate: () => void }) {
  const nodes = useFlowStore((s) => s.nodes.length)
  const edges = useFlowStore((s) => s.edges.length)

  return (
    <main className="hf-hero">
      <div className="hf-headline">
        <div className="hf-eyebrow">Map your thinking</div>
        <h1 className="hf-title">
          <span>IDEAS IN</span>
          <span className="hf-stroke">MOTION</span>
        </h1>
      </div>

      <Stage onCreate={onCreate} nodes={nodes} edges={edges} />

      <div className="hf-side">
        <strong>Your ideas deserve structure.</strong>
        Start with one thought. Add questions, connect evidence and let the map
        grow with you.
      </div>

      <div className="hf-counter">
        Local-first workspace
        <b>∞</b>
        room to think
      </div>
    </main>
  )
}

function Stage({ onCreate, nodes, edges }: { onCreate: () => void; nodes: number; edges: number }) {
  const board = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = board.current
    if (!el) return

    let frame = 0
    // below 900px the board sits flat: a pointer would be a finger, and tipping
    // the card under a thumb reads as a wobble rather than depth
    const onMove = (event: MouseEvent) => {
      if (window.innerWidth < 900 || frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const x = (event.clientX / window.innerWidth - 0.5) * 8
        const y = (event.clientY / window.innerHeight - 0.5) * -5
        el.style.transform = `translate(-50%, -46%) rotateX(${3 + y}deg) rotateY(${-7 + x}deg)`
      })
    }
    const onLeave = () => {
      el.style.transform = ''
    }

    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [])

  const plural = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`

  return (
    <section className="hf-stage" aria-label="Preview of an Idea Flow board">
      <div className="hf-glow" />

      <div className="hf-card hf-card-left">
        <div className="hf-label">On this device</div>
        <strong>{DEFAULT_BOARD_NAME}</strong>
        <small>
          {plural(nodes, 'node')} · {plural(edges, 'connection')}
        </small>
      </div>

      <div className="hf-card hf-card-right">
        <div className="hf-label">Current language</div>
        <strong>Idea · Question · Evidence</strong>
        <small>Turn loose thoughts into a visual system.</small>
      </div>

      <div className="hf-canvas" ref={board}>
        <div className="hf-top">
          <div className="hf-canvas-title">Untitled Project</div>
          <div className="hf-tools">
            <i className="hf-tiny" />
            <i className="hf-tiny" />
            <i className="hf-tiny" />
          </div>
        </div>

        <div className="hf-edge hf-e1" />
        <div className="hf-edge hf-e2" />

        <article className="hf-node hf-idea">
          <div className="hf-kicker">Idea</div>
          <h3>One shared workspace</h3>
          <p>Keep the system visible instead of spreading it across folders.</p>
        </article>

        <article className="hf-node hf-question">
          <div className="hf-kicker">Question</div>
          <h3>What depends on what?</h3>
          <p>Make hidden assumptions explicit.</p>
        </article>

        <article className="hf-node hf-evidence">
          <div className="hf-kicker">Evidence</div>
          <h3>Context stays connected</h3>
          <p>Sources, decisions and facts stay close to the idea.</p>
        </article>
      </div>

      <button
        type="button"
        className="hf-sticker"
        onClick={onCreate}
        aria-label="Start a new flow"
        title="Start a new flow"
      >
        <span className="hf-plus">+</span>
      </button>
    </section>
  )
}

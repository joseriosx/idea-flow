import { useFlowStore } from '../store/flowStore'

/** One line, briefly, when something the user asked for actually happened. */
export function Toaster() {
  const toast = useFlowStore((s) => s.toast)
  if (!toast) return null

  const ok = toast.tone === 'ok'

  return (
    <div
      // keyed on the toast so a repeat message replays the entrance
      key={toast.id}
      className="anim-rise pointer-events-none absolute bottom-[4.75rem] left-1/2 z-20 -translate-x-1/2"
    >
      <div className="hud flex max-w-[24rem] items-center gap-2.5 rounded-full px-3.5 py-2">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: ok ? 'var(--color-evidence)' : 'var(--color-idea)' }}
        />
        <span className="truncate text-[11.5px] font-normal text-fg">{toast.text}</span>
      </div>
    </div>
  )
}

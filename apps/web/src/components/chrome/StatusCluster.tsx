import { useRef } from 'react'
import { useReactFlow } from '@xyflow/react'

import { useApiStatus } from '../../hooks/useApiStatus'
import { fetchGraph } from '../../lib/api'
import { useFlowStore } from '../../store/flowStore'
import { IconImport } from '../icons'

/**
 * How the board is doing, and whether there is an api behind it.
 *
 * The api is optional by design, so an absent one is a state, not an error: a
 * hollow dot. Only the click re-checks, so a restart of the api container is
 * recoverable without reloading the page.
 */
export function StatusCluster() {
  const { api, recheck } = useApiStatus()
  const nodes = useFlowStore((s) => s.nodes.length)
  const edges = useFlowStore((s) => s.edges.length)
  const notify = useFlowStore((s) => s.notify)
  const applyGraph = useFlowStore((s) => s.applyGraph)
  const { fitView } = useReactFlow()
  const busy = useRef(false)

  const tone =
    api.status === 'online'
      ? 'var(--color-evidence)'
      : api.status === 'checking'
        ? 'var(--color-idea)'
        : 'transparent'

  const text = !api.configured
    ? 'api · local only'
    : api.status === 'idle'
      ? 'api · idle'
      : api.status === 'checking'
        ? 'api · checking'
        : api.status === 'online'
          ? 'api · online'
          : 'api · unreachable'

  const load = async () => {
    if (busy.current) return
    busy.current = true
    try {
      const result = await fetchGraph()
      if (!result.ok) {
        notify(`could not load a graph — ${result.detail}`, 'warn')
        return
      }
      applyGraph(result.graph)
      const { nodes: n, edges: e } = result.graph
      notify(`loaded ${n} cards and ${e} links from the api`)
      requestAnimationFrame(() => {
        void fitView({ padding: 0.16, duration: 460, maxZoom: 1 })
      })
    } finally {
      busy.current = false
    }
  }

  return (
    <div
      className="anim-rise absolute right-5 top-5 z-10 flex items-center gap-2"
      style={{ animationDelay: '80ms' }}
    >
      <button
        type="button"
        onClick={() => {
          if (!api.configured) {
            notify('no api configured — set VITE_API_URL and rebuild', 'warn')
            return
          }
          void recheck()
        }}
        title={
          api.configured
            ? `${api.base} — ${api.detail}${api.checkedAt ? ` (checked ${new Date(api.checkedAt).toLocaleTimeString()})` : ''}. Click to re-check.`
            : 'Set VITE_API_URL to talk to the api. The board works without one.'
        }
        className="hud flex items-center gap-2 rounded-full px-3 py-2 transition-colors hover:bg-panel-hover"
      >
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span
            className={`h-2 w-2 rounded-full ${api.status === 'offline' ? 'anim-beacon' : ''}`}
            style={{
              background: tone,
              boxShadow:
                api.status === 'online'
                  ? '0 0 10px var(--color-evidence)'
                  : 'inset 0 0 0 1px var(--color-fg-faint)',
            }}
          />
        </span>
        <span className="micro tracking-[0.12em] text-fg-mid">
          {text}
        </span>
      </button>

      <div className="hud hidden items-center gap-2.5 rounded-full px-3 py-2 sm:flex">
        <span className="micro tracking-[0.12em] text-fg-dim">
          <span className="text-fg">{nodes}</span> cards
        </span>
        <span className="h-3 w-px bg-divider" />
        <span className="micro tracking-[0.12em] text-fg-dim">
          <span className="text-fg">{edges}</span> links
        </span>
      </div>

      <button
        type="button"
        onClick={() => void load()}
        disabled={!api.configured}
        title={
          api.configured
            ? 'Replace the board with the graph the api returns'
            : 'Set VITE_API_URL to enable this'
        }
        className="hud grid h-9 w-9 place-items-center rounded-full text-fg-dim transition-colors hover:text-fg disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:text-fg-dim"
      >
        <IconImport />
      </button>
    </div>
  )
}

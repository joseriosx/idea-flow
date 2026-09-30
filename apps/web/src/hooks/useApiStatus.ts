import { useCallback, useEffect } from 'react'

import { checkHealth } from '../lib/api'
import { useFlowStore } from '../store/flowStore'

/**
 * The api is optional, so this reports and never blocks: the board is fully
 * usable whether the answer is yes, no, or "there is no api configured".
 */
export function useApiStatus() {
  const api = useFlowStore((s) => s.api)
  const setApi = useFlowStore((s) => s.setApi)

  const recheck = useCallback(async () => {
    if (!api.configured) return
    setApi({ status: 'checking' })
    const result = await checkHealth()
    setApi({
      status: result.ok ? 'online' : 'offline',
      detail: result.ok ? 'healthy' : result.detail,
      checkedAt: Date.now(),
    })
  }, [api.configured, setApi])

  useEffect(() => {
    void recheck()
  }, [recheck])

  return { api, recheck }
}

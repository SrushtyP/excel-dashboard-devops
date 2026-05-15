// Polls /api/vms every 15s for live VM states from Azure
import { useState, useEffect, useCallback } from 'react'

export function useAzureVMs(enabled = true) {
  const [vms, setVms]       = useState(null)
  const [error, setError]   = useState(null)
  const [lastSync, setSync] = useState(null)

  const fetchVMs = useCallback(async () => {
    try {
      const res  = await fetch('/api/vms')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setVms(data.vms)
      setSync(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchVMs()
    const t = setInterval(fetchVMs, 15000)
    return () => clearInterval(t)
  }, [enabled, fetchVMs])

  return { vms, error, lastSync, refetch: fetchVMs }
}

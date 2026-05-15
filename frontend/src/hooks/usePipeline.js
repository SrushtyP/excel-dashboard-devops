// Polls /api/pipeline/runs every 20s for live GitHub Actions data
import { useState, useEffect, useCallback } from 'react'

export function usePipeline(enabled = true) {
  const [runs, setRuns]     = useState(null)
  const [error, setError]   = useState(null)
  const [lastSync, setSync] = useState(null)

  const fetchRuns = useCallback(async () => {
    try {
      const res  = await fetch('/api/pipeline/runs')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setRuns(data.runs)
      setSync(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchRuns()
    const t = setInterval(fetchRuns, 20000)
    return () => clearInterval(t)
  }, [enabled, fetchRuns])

  return { runs, error, lastSync, refetch: fetchRuns }
}

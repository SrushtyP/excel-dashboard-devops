// Polls /api/cost every 5 minutes for live Azure cost data
import { useState, useEffect, useCallback } from 'react'

export function useAzureCost(enabled = true) {
  const [cost, setCost]     = useState(null)
  const [error, setError]   = useState(null)
  const [lastSync, setSync] = useState(null)

  const fetchCost = useCallback(async () => {
    try {
      const res  = await fetch('/api/cost')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCost(data)
      setSync(new Date())
      setError(null)
    } catch (e) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    fetchCost()
    const t = setInterval(fetchCost, 300000) // every 5 min
    return () => clearInterval(t)
  }, [enabled, fetchCost])

  return { cost, error, lastSync, refetch: fetchCost }
}

import { useEffect } from 'react'

/**
 * Polls `onRefresh` on a fixed interval. No-op when disabled or interval is 0.
 */
export function useAutoRefresh({ enabled = true, intervalMs = 0, onRefresh }) {
  useEffect(() => {
    if (!enabled || !intervalMs || intervalMs <= 0 || typeof onRefresh !== 'function') {
      return undefined
    }

    const id = window.setInterval(() => {
      onRefresh()
    }, intervalMs)

    return () => window.clearInterval(id)
  }, [enabled, intervalMs, onRefresh])
}

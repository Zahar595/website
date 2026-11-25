import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchBoard, sendPing } from '../lib/leaderboard'

const POLL_MS = 4000
const PING_MS = 12000

/**
 * Polls the leaderboard and keeps a "players online" heartbeat.
 * Returns the board plus a locally injected optimistic entry so a fresh
 * score shows up instantly, before the next poll confirms it.
 */
export default function useLeaderboard(playerId) {
  const [board, setBoard] = useState({ top: [], live: 0, storage: null })
  const [status, setStatus] = useState('connecting')
  const [updatedAt, setUpdatedAt] = useState(null)
  const [optimistic, setOptimistic] = useState(null)
  const mounted = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const data = await fetchBoard(playerId)
      if (!mounted.current) return
      setBoard({ top: data.top || [], live: data.live || 0, storage: data.storage })
      setStatus('live')
      setUpdatedAt(Date.now())
    } catch {
      if (mounted.current) setStatus((s) => (s === 'live' ? 'stale' : 'offline'))
    }
  }, [playerId])

  useEffect(() => {
    mounted.current = true
    refresh()
    const poll = setInterval(refresh, POLL_MS)
    const ping = setInterval(() => {
      sendPing(playerId).catch(() => {})
    }, PING_MS)
    sendPing(playerId).catch(() => {})
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      mounted.current = false
      clearInterval(poll)
      clearInterval(ping)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [playerId, refresh])

  const applySubmitResult = useCallback((result) => {
    if (!result) return
    if (Array.isArray(result.top)) {
      setBoard({ top: result.top, live: result.live || 0, storage: result.storage })
      setStatus('live')
      setUpdatedAt(Date.now())
    }
    if (result.entry) setOptimistic({ ...result.entry, rank: result.rank })
  }, [])

  const rows = (() => {
    const top = [...board.top]
    if (optimistic && !top.some((e) => e.id === optimistic.id)) {
      top.push({ id: optimistic.id, name: optimistic.name, score: optimistic.score, ts: optimistic.ts, local: true })
      top.sort((a, b) => b.score - a.score || a.ts - b.ts)
    }
    return top.map((e, i) => ({ ...e, rank: i + 1 }))
  })()

  return { rows, live: board.live, status, updatedAt, storage: board.storage, refresh, applySubmitResult }
}

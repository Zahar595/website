const ENDPOINT = '/api/leaderboard'

export function loadIdentity() {
  const fallback = () => ({
    id: `p_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`,
    name: '',
  })
  try {
    const raw = localStorage.getItem('flappy3d:player')
    if (!raw) {
      const id = fallback()
      localStorage.setItem('flappy3d:player', JSON.stringify(id))
      return id
    }
    const parsed = JSON.parse(raw)
    return { id: parsed.id || fallback().id, name: typeof parsed.name === 'string' ? parsed.name : '' }
  } catch {
    return fallback()
  }
}

export function saveIdentity(identity) {
  try {
    localStorage.setItem('flappy3d:player', JSON.stringify(identity))
  } catch {
    /* private mode */
  }
}

export function loadBest() {
  try {
    return Number(localStorage.getItem('flappy3d:best')) || 0
  } catch {
    return 0
  }
}

export function saveBest(score) {
  try {
    localStorage.setItem('flappy3d:best', String(score))
  } catch {
    /* ignore */
  }
}

export function loadMuted() {
  try {
    return localStorage.getItem('flappy3d:muted') === '1'
  } catch {
    return false
  }
}

export function saveMuted(muted) {
  try {
    localStorage.setItem('flappy3d:muted', muted ? '1' : '0')
  } catch {
    /* ignore */
  }
}

export async function fetchBoard(playerId) {
  const url = `${ENDPOINT}?limit=20${playerId ? `&playerId=${encodeURIComponent(playerId)}` : ''}`
  const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`board ${res.status}`)
  return res.json()
}

export async function submitScore({ name, score, playerId }) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'submit', name, score, playerId }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(json.error || `submit ${res.status}`)
  return json
}

export async function sendPing(playerId) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'ping', playerId }),
  })
  if (!res.ok) throw new Error(`ping ${res.status}`)
  return res.json()
}

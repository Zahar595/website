/**
 * Live global leaderboard for Flappy Bird 3D.
 *
 * Single serverless function so the in-memory fallback store is shared
 * between GET and POST inside the same warm instance.
 *
 * Storage:
 *  - If the project has an Upstash / Vercel KV REST integration
 *    (KV_REST_API_URL + KV_REST_API_TOKEN, or the UPSTASH_* pair),
 *    scores live in a Redis sorted set and are shared by every instance.
 *  - Otherwise it falls back to process memory: a real, working live board
 *    that resets whenever the function cold-starts.
 *
 * GET  /api/leaderboard           -> board + live player count
 * POST /api/leaderboard           -> { action: "submit", name, score, playerId }
 *                                    { action: "ping", playerId }
 */

const KEY_SCORES = 'flappy3d:scores:v1'
const KEY_PRESENCE = 'flappy3d:presence:v1'
const MAX_ENTRIES = 100
const LIVE_WINDOW_MS = 25_000
const MAX_SCORE = 999
const NAME_MAX = 14

/* ------------------------------------------------------------------ */
/* in-memory fallback store                                            */
/* ------------------------------------------------------------------ */

const memory =
  globalThis.__flappy3dStore ||
  (globalThis.__flappy3dStore = {
    scores: [
      { id: 'seed-1', name: 'Skyhawk', score: 24, ts: Date.now() - 864e5 },
      { id: 'seed-2', name: 'Nimbus', score: 17, ts: Date.now() - 432e5 },
      { id: 'seed-3', name: 'Pip', score: 11, ts: Date.now() - 216e5 },
      { id: 'seed-4', name: 'Doodle', score: 7, ts: Date.now() - 108e5 },
      { id: 'seed-5', name: 'Birb', score: 3, ts: Date.now() - 36e5 },
    ],
    presence: new Map(),
    rate: new Map(),
  })

function memList(limit) {
  return [...memory.scores].sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, limit)
}

function memAdd(entry) {
  memory.scores.push(entry)
  memory.scores = [...memory.scores].sort((a, b) => b.score - a.score || a.ts - b.ts).slice(0, MAX_ENTRIES)
}

function memPing(playerId) {
  const now = Date.now()
  memory.presence.set(playerId, now)
  for (const [id, ts] of memory.presence) {
    if (now - ts > LIVE_WINDOW_MS) memory.presence.delete(id)
  }
  return memory.presence.size
}

/* ------------------------------------------------------------------ */
/* Upstash Redis REST backend                                          */
/* ------------------------------------------------------------------ */

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return { url: url.replace(/\/$/, ''), token }
}

async function redisPipeline(commands) {
  const cfg = redisConfig()
  if (!cfg) throw new Error('no redis config')
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commands),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`redis ${res.status}`)
  const json = await res.json()
  return json.map((r) => (r && 'result' in r ? r.result : null))
}

function parseMember(member) {
  try {
    const v = JSON.parse(member)
    if (typeof v?.s !== 'number') return null
    return { id: v.i, name: v.n, score: v.s, ts: v.t }
  } catch {
    return null
  }
}

async function redisList(limit) {
  const [raw] = await redisPipeline([['ZREVRANGE', KEY_SCORES, 0, limit - 1, 'WITHSCORES']])
  if (!Array.isArray(raw)) return []
  const out = []
  for (let i = 0; i < raw.length; i += 2) {
    const parsed = parseMember(raw[i])
    if (parsed) out.push(parsed)
  }
  return out
}

async function redisAdd(entry) {
  const member = JSON.stringify({ i: entry.id, n: entry.name, s: entry.score, t: entry.ts })
  await redisPipeline([
    ['ZADD', KEY_SCORES, entry.score, member],
    ['ZREMRANGEBYRANK', KEY_SCORES, 0, -(MAX_ENTRIES + 1)],
  ])
}

async function redisPing(playerId) {
  const now = Date.now()
  const [, , count] = await redisPipeline([
    ['ZADD', KEY_PRESENCE, now, playerId],
    ['ZREMRANGEBYSCORE', KEY_PRESENCE, '-inf', now - LIVE_WINDOW_MS],
    ['ZCARD', KEY_PRESENCE],
  ])
  return Number(count) || 0
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function cleanName(raw) {
  const name = String(raw ?? '')
    .replace(/[\u0000-\u001f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
  return name || 'Anonymous'
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd) return fwd.split(',')[0].trim()
  return req.socket?.remoteAddress || 'unknown'
}

function rateLimited(req) {
  const now = Date.now()
  const ip = clientIp(req)
  const hits = (memory.rate.get(ip) || []).filter((t) => now - t < 60_000)
  hits.push(now)
  memory.rate.set(ip, hits)
  if (memory.rate.size > 5000) memory.rate.clear()
  return hits.length > 40
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body)
    } catch {
      return {}
    }
  }
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  if (!chunks.length) return {}
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    return {}
  }
}

function send(res, status, payload) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.end(JSON.stringify(payload))
}

function shapeBoard(entries, extra) {
  return {
    top: entries.map((e, i) => ({
      rank: i + 1,
      id: e.id,
      name: e.name,
      score: e.score,
      ts: e.ts,
    })),
    ...extra,
  }
}

/* ------------------------------------------------------------------ */
/* handler                                                             */
/* ------------------------------------------------------------------ */

export default async function handler(req, res) {
  const useRedis = Boolean(redisConfig())
  const storage = useRedis ? 'redis' : 'memory'

  try {
    if (req.method === 'GET' || req.method === 'HEAD') {
      const url = new URL(req.url, 'http://localhost')
      const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit')) || 20))
      const playerId = (url.searchParams.get('playerId') || '').slice(0, 60)

      const [top, live] = await Promise.all([
        useRedis ? redisList(limit) : memList(limit),
        playerId ? (useRedis ? redisPing(playerId) : memPing(playerId)) : Promise.resolve(0),
      ])

      return send(res, 200, shapeBoard(top, { live, storage, serverTime: Date.now() }))
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return send(res, 405, { error: 'Method not allowed' })
    }

    if (rateLimited(req)) return send(res, 429, { error: 'Slow down a little 🐢' })

    const body = await readJson(req instanceof Object ? req : null)
    const action = String(body.action || 'board')
    const playerId = String(body.playerId || '').slice(0, 60)

    if (action === 'ping') {
      const live = playerId ? (useRedis ? await redisPing(playerId) : memPing(playerId)) : 0
      return send(res, 200, { ok: true, live, storage })
    }

    if (action === 'submit') {
      const score = Math.floor(Number(body.score))
      if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) {
        return send(res, 400, { error: 'Invalid score' })
      }
      const entry = {
        id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        name: cleanName(body.name),
        score,
        ts: Date.now(),
      }
      if (useRedis) await redisAdd(entry)
      else memAdd(entry)

      const [top, live] = await Promise.all([
        useRedis ? redisList(20) : memList(20),
        playerId ? (useRedis ? redisPing(playerId) : memPing(playerId)) : Promise.resolve(0),
      ])
      const rank = top.findIndex((e) => e.id === entry.id) + 1
      return send(res, 200, {
        ok: true,
        entry,
        rank: rank || null,
        ...shapeBoard(top, { live, storage, serverTime: Date.now() }),
      })
    }

    // action === 'board'
    const top = useRedis ? await redisList(20) : memList(20)
    return send(res, 200, shapeBoard(top, { live: 0, storage, serverTime: Date.now() }))
  } catch (err) {
    console.error('[leaderboard]', err)
    return send(res, 200, {
      top: memList(20).map((e, i) => ({ rank: i + 1, ...e })),
      live: memory.presence.size,
      storage: 'memory-fallback',
      serverTime: Date.now(),
      degraded: true,
    })
  }
}

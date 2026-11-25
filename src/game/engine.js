/**
 * flappy-3d — core game simulation.
 * Pure mutable state + step(), so the render loop can run at 60fps
 * without touching React.
 *
 * Axis convention: the bird flies "into" the screen along -Z.
 * The bird stays at z = 0, the pipes travel towards the camera (+Z).
 */

export const CONFIG = {
  gravity: -31,
  flapVelocity: 10.4,
  baseSpeed: 17,
  maxSpeed: 27,
  // distance between two pipe pairs (world units)
  pipeSpacing: 26,
  birdZ: 0,
  spawnZ: -96,
  despawnZ: 12.5,
  birdRadius: 0.52,
  pipeRadius: 1.34,
  gapBase: 5.0,
  gapMin: 4.0,
  gapStep: 0.04,
  ceiling: 8.6,
  floor: -6.6,
  slots: 10,
  maxYdelta: 3.1,
}

export function createGame() {
  return {
    phase: 'ready', // ready | playing | dying | dead
    time: 0,
    score: 0,
    speed: CONFIG.baseSpeed,
    spawnTimer: 0.55,
    lastGapY: 0.8,
    shake: 0,
    deathTimer: 0,
    bird: { y: 1.4, vy: 0, rot: 0, flapPhase: 0, flapBoost: 0 },
    slots: Array.from({ length: CONFIG.slots }, () => ({
      active: false,
      z: 0,
      gapY: 0,
      gap: CONFIG.gapBase,
      scored: false,
      seed: 0,
    })),
    callbacks: { onScore: null, onDeath: null, onFlap: null },
  }
}

export function resetGame(game) {
  game.phase = 'ready'
  game.time = 0
  game.score = 0
  game.speed = CONFIG.baseSpeed
  game.spawnTimer = 0.55
  game.lastGapY = 0.8
  game.shake = 0
  game.deathTimer = 0
  game.bird.y = 1.4
  game.bird.vy = 0
  game.bird.rot = 0
  game.bird.flapBoost = 0
  for (const s of game.slots) s.active = false
}

export function flap(game) {
  if (game.phase === 'ready') game.phase = 'playing'
  if (game.phase !== 'playing') return false
  game.bird.vy = CONFIG.flapVelocity
  game.bird.flapBoost = 1
  game.callbacks.onFlap?.()
  return true
}

function spawnPipe(game) {
  const slot = game.slots.find((s) => !s.active)
  if (!slot) return
  const gap = Math.max(CONFIG.gapMin, CONFIG.gapBase - game.score * CONFIG.gapStep)
  const min = CONFIG.floor + gap / 2 + 1.6
  const max = CONFIG.ceiling - gap / 2 - 1.2
  let gapY = game.lastGapY + (Math.random() * 2 - 1) * CONFIG.maxYdelta
  // keep the corridor continuous but always reachable
  gapY = Math.min(Math.max(gapY, min), max)
  game.lastGapY = gapY
  slot.active = true
  slot.z = CONFIG.spawnZ
  slot.gapY = gapY
  slot.gap = gap
  slot.scored = false
  slot.seed = Math.random() * 100
}

function kill(game) {
  if (game.phase !== 'playing') return
  game.phase = 'dying'
  game.deathTimer = 0
  game.shake = 1
  game.callbacks.onDeath?.(game.score)
}

export function step(game, dt) {
  // clamp dt so a backgrounded tab can't teleport the bird through a pipe
  dt = Math.min(dt, 1 / 30)
  game.time += dt
  game.bird.flapBoost = Math.max(0, game.bird.flapBoost - dt * 4.5)
  game.bird.flapPhase += dt * (game.phase === 'playing' ? 13 : 5)
  game.shake = Math.max(0, game.shake - dt * 2.2)

  if (game.phase === 'ready') {
    game.bird.y = 1.4 + Math.sin(game.time * 2.1) * 0.42
    game.bird.rot = Math.sin(game.time * 2.1) * 0.12
    for (const s of game.slots) if (s.active) s.z += game.speed * dt
    return
  }

  if (game.phase === 'dead') {
    game.bird.vy += CONFIG.gravity * dt * 0.6
    game.bird.y = Math.max(CONFIG.floor + 0.5, game.bird.y + game.bird.vy * dt)
    game.bird.rot += (-1.35 - game.bird.rot) * Math.min(1, dt * 6)
    return
  }

  if (game.phase === 'dying') {
    // quick tumble before the game-over card appears
    game.deathTimer += dt
    game.bird.vy += CONFIG.gravity * dt
    game.bird.y = Math.max(CONFIG.floor + 0.45, game.bird.y + game.bird.vy * dt)
    game.bird.rot += (-1.45 - game.bird.rot) * Math.min(1, dt * 5)
    if (game.deathTimer > 0.9) game.phase = 'dead'
    return
  }

  // ---- playing ----
  game.speed = Math.min(CONFIG.maxSpeed, CONFIG.baseSpeed + game.score * 0.45)
  const bird = game.bird
  bird.vy += CONFIG.gravity * dt
  bird.y += bird.vy * dt

  // ceiling is a soft wall, the ground kills you
  if (bird.y > CONFIG.ceiling) {
    bird.y = CONFIG.ceiling
    bird.vy = Math.min(bird.vy, 0)
  }

  // pitch the bird: +rotation.x lifts the nose (the bird faces -Z)
  const targetRot = Math.max(-0.78, Math.min(1.15, bird.vy * 0.055))
  bird.rot += (targetRot - bird.rot) * Math.min(1, dt * 9)

  // pipes
  game.spawnTimer -= dt
  if (game.spawnTimer <= 0) {
    spawnPipe(game)
    game.spawnTimer += CONFIG.pipeSpacing / game.speed
  }

  for (const s of game.slots) {
    if (!s.active) continue
    s.z += game.speed * dt
    if (s.z > CONFIG.despawnZ) {
      s.active = false
      continue
    }
    const dz = Math.abs(s.z - CONFIG.birdZ)
    if (dz < CONFIG.pipeRadius + CONFIG.birdRadius * 0.82) {
      const top = s.gapY + s.gap / 2
      const bottom = s.gapY - s.gap / 2
      if (bird.y + CONFIG.birdRadius * 0.9 > top || bird.y - CONFIG.birdRadius * 0.9 < bottom) {
        kill(game)
        return
      }
    }
    if (!s.scored && s.z > CONFIG.birdZ + 0.4) {
      s.scored = true
      game.score += 1
      game.callbacks.onScore?.(game.score)
    }
  }

  if (bird.y - CONFIG.birdRadius < CONFIG.floor) {
    bird.y = CONFIG.floor + CONFIG.birdRadius
    kill(game)
  }
}

export const MEDALS = [
  { min: 40, label: 'Platinum', emoji: '💎', color: '#a5f3fc' },
  { min: 25, label: 'Gold', emoji: '🥇', color: '#fde047' },
  { min: 12, label: 'Silver', emoji: '🥈', color: '#e2e8f0' },
  { min: 5, label: 'Bronze', emoji: '🥉', color: '#fdba74' },
  { min: 0, label: 'Rookie', emoji: '🐣', color: '#cbd5e1' },
]

export function medalFor(score) {
  return MEDALS.find((m) => score >= m.min) ?? MEDALS[MEDALS.length - 1]
}

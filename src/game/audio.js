/** Tiny WebAudio synth — no audio assets, no network. */

let ctx = null
let muted = false

function ac() {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {})
  return ctx
}

export function setMuted(value) {
  muted = value
}
export function isMuted() {
  return muted
}

function tone({ freq, to, dur = 0.12, type = 'sine', gain = 0.14, delay = 0 }) {
  if (muted) return
  const c = ac()
  if (!c) return
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(30, to), t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(c.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.03)
}

function noise({ dur = 0.25, gain = 0.22, filter = 1400 }) {
  if (muted) return
  const c = ac()
  if (!c) return
  const frames = Math.floor(c.sampleRate * dur)
  const buffer = c.createBuffer(1, frames, c.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < frames; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / frames) ** 2
  }
  const src = c.createBufferSource()
  src.buffer = buffer
  const biquad = c.createBiquadFilter()
  biquad.type = 'lowpass'
  biquad.frequency.value = filter
  const g = c.createGain()
  g.gain.value = gain
  src.connect(biquad).connect(g).connect(c.destination)
  src.start()
}

export const sfx = {
  flap() {
    tone({ freq: 360, to: 620, dur: 0.09, type: 'triangle', gain: 0.09 })
    noise({ dur: 0.07, gain: 0.05, filter: 900 })
  },
  score() {
    tone({ freq: 880, dur: 0.08, type: 'square', gain: 0.07 })
    tone({ freq: 1320, dur: 0.1, type: 'square', gain: 0.06, delay: 0.075 })
  },
  hit() {
    noise({ dur: 0.3, gain: 0.3, filter: 800 })
    tone({ freq: 180, to: 60, dur: 0.3, type: 'sawtooth', gain: 0.14 })
  },
  gameOver() {
    tone({ freq: 420, to: 120, dur: 0.55, type: 'triangle', gain: 0.11, delay: 0.1 })
  },
  ui() {
    tone({ freq: 520, to: 760, dur: 0.07, type: 'sine', gain: 0.05 })
  },
}

export function unlockAudio() {
  ac()
}

import { useCallback, useEffect, useRef, useState } from 'react'
import Scene from './scene/Scene'
import Leaderboard from './components/Leaderboard'
import { StartOverlay, GameOverCard } from './components/Overlays'
import useLeaderboard from './hooks/useLeaderboard'
import { createGame, flap, medalFor, resetGame } from './game/engine'
import { sfx, setMuted, unlockAudio } from './game/audio'
import {
  loadBest,
  loadIdentity,
  loadMuted,
  saveBest,
  saveIdentity,
  saveMuted,
  submitScore,
} from './lib/leaderboard'

export default function App() {
  const gameRef = useRef(null)
  if (!gameRef.current) gameRef.current = createGame()
  const game = gameRef.current

  const [identity, setIdentity] = useState(loadIdentity)
  const [ui, setUi] = useState({ phase: 'ready', score: 0 })
  const [best, setBest] = useState(loadBest)
  const [newBest, setNewBest] = useState(false)
  const [muted, setMutedState] = useState(loadMuted)
  const [submission, setSubmission] = useState({ status: 'idle', rank: null })
  const [boardOpen, setBoardOpen] = useState(
    () => typeof window === 'undefined' || window.innerWidth > 780,
  )

  const identityRef = useRef(identity)
  identityRef.current = identity
  const deadAtRef = useRef(0)

  const leaderboard = useLeaderboard(identity.id)
  const applySubmitResult = leaderboard.applySubmitResult

  useEffect(() => {
    setMuted(muted)
  }, [muted])

  const submit = useCallback(
    async (score, name) => {
      if (!name) {
        setSubmission({ status: 'needs-name', rank: null })
        return false
      }
      setSubmission({ status: 'saving', rank: null })
      try {
        const result = await submitScore({ name, score, playerId: identityRef.current.id })
        applySubmitResult(result)
        setSubmission({ status: 'saved', rank: result.rank ?? null })
        return true
      } catch {
        setSubmission({ status: 'error', rank: null })
        return false
      }
    },
    [applySubmitResult],
  )

  /* ----------------------------- game wiring ----------------------------- */

  useEffect(() => {
    game.callbacks.onScore = (score) => {
      setUi((u) => ({ ...u, phase: 'playing', score }))
      sfx.score()
    }

    game.callbacks.onFlap = () => sfx.flap()

    game.callbacks.onDeath = (score) => {
      deadAtRef.current = Date.now()
      sfx.hit()
      window.setTimeout(() => sfx.gameOver(), 240)

      const previousBest = loadBest()
      if (score > previousBest) {
        saveBest(score)
        setBest(score)
        setNewBest(true)
      } else {
        setBest(previousBest)
        setNewBest(false)
      }

      setSubmission({ status: 'idle', rank: null })
      window.setTimeout(() => setUi({ phase: 'dead', score }), 820)

      const name = identityRef.current.name
      if (score > 0) {
        if (name) submit(score, name)
        else setSubmission({ status: 'needs-name', rank: null })
      }
    }

    return () => {
      game.callbacks.onScore = null
      game.callbacks.onDeath = null
      game.callbacks.onFlap = null
    }
  }, [game, submit])

  const startRun = useCallback(() => {
    if (game.phase !== 'ready') return
    setUi({ phase: 'playing', score: 0 })
    setNewBest(false)
    setSubmission({ status: 'idle', rank: null })
    flap(game)
  }, [game])

  const retry = useCallback(() => {
    if (Date.now() - deadAtRef.current < 350) return
    resetGame(game)
    setUi({ phase: 'playing', score: 0 })
    setNewBest(false)
    setSubmission({ status: 'idle', rank: null })
    flap(game)
    sfx.ui()
  }, [game])

  /* -------------------------------- input -------------------------------- */

  useEffect(() => {
    const flapNow = () => {
      unlockAudio()
      if (game.phase === 'ready') startRun()
      else if (game.phase === 'playing') flap(game)
      else if (game.phase === 'dead') retry()
    }

    const onPointerDown = (e) => {
      if (e.target instanceof Element && e.target.closest('[data-ui]')) return
      flapNow()
    }

    const onKeyDown = (e) => {
      if (e.code === 'KeyM') {
        setMutedState((m) => {
          saveMuted(!m)
          setMuted(!m)
          return !m
        })
        return
      }
      if (e.code !== 'Space' && e.code !== 'ArrowUp' && e.code !== 'KeyW') return
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      flapNow()
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [game, startRun, retry])

  /* -------------------------------- render ------------------------------- */

  const medal = medalFor(ui.score)

  return (
    <div className={`app app--${ui.phase}`}>
      <div className="canvas-wrap">
        <Scene game={game} />
      </div>
      <div className="vignette" aria-hidden="true" />

      <header className="hud">
        <div className="hud__brand">
          <span className="hud__dot" />
          FLAPPY<b>3D</b>
        </div>

        <div className={`hud__score ${ui.phase === 'playing' ? 'is-playing' : ''}`}>
          <span key={ui.score} className="hud__score-value">
            {String(ui.score).padStart(2, '0')}
          </span>
          <span className="hud__score-label">points</span>
        </div>

        <div className="hud__actions" data-ui>
          <button
            className="icon-btn"
            onClick={() => {
              setMutedState((m) => {
                saveMuted(!m)
                setMuted(!m)
                return !m
              })
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            title={muted ? 'Unmute (M)' : 'Mute (M)'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            className="icon-btn icon-btn--board"
            onClick={() => setBoardOpen((o) => !o)}
            aria-label="Toggle leaderboard"
            title="Leaderboard"
          >
            🏆
          </button>
        </div>
      </header>

      <Leaderboard
        rows={leaderboard.rows}
        live={leaderboard.live}
        status={leaderboard.status}
        updatedAt={leaderboard.updatedAt}
        open={boardOpen}
        onToggle={() => setBoardOpen((o) => !o)}
      />

      {ui.phase === 'ready' && <StartOverlay best={best} onStart={startRun} />}

      {ui.phase === 'dead' && (
        <GameOverCard
          score={ui.score}
          best={best}
          medal={medal}
          isNewBest={newBest}
          submission={submission}
          savedName={identity.name}
          onSubmitName={(name) => {
            const next = { ...identity, name }
            setIdentity(next)
            saveIdentity(next)
            submit(ui.score, name)
          }}
          onRetry={retry}
        />
      )}

      <div className="credit">
        built with react + three.js · live board on{' '}
        <span className="credit__badge">▲ vercel</span>
      </div>
    </div>
  )
}

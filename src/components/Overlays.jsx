import { useEffect, useRef, useState } from 'react'

export function StartOverlay({ best, onStart }) {
  return (
    <div className="overlay overlay--start">
      <div className="card card--start">
        <p className="eyebrow">react · three.js · vercel</p>
        <h1 className="title">
          FLAPPY<span className="title__accent">3D</span>
        </h1>
        <p className="tagline">One bird. Endless pipes. A live global leaderboard.</p>
        <div className="btn btn--primary btn--fake" onClick={onStart}>
          Tap to fly
        </div>
        <p className="hint">
          <kbd>Space</kbd> or <kbd>Click</kbd> to flap · <kbd>M</kbd> to mute
        </p>
        {best > 0 && (
          <p className="best">
            Personal best <b>{best}</b>
          </p>
        )}
      </div>
    </div>
  )
}

export function GameOverCard({
  score,
  best,
  medal,
  isNewBest,
  submission,
  savedName,
  onSubmitName,
  onRetry,
}) {
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (submission.status === 'needs-name' && inputRef.current) inputRef.current.focus()
  }, [submission.status])

  const canSubmit = score > 0 && !['saving', 'saved'].includes(submission.status)

  return (
    <div
      className="overlay overlay--over"
      data-ui
      onClick={(e) => {
        if (e.target === e.currentTarget) onRetry()
      }}
    >
      <div className="card card--over">
        <p className="eyebrow">run over</p>
        <div className="score-big">{score}</div>
        <div className="medal" style={{ '--medal': medal.color }}>
          <span>{medal.emoji}</span> {medal.label}
          {isNewBest && <em className="newbest">new best!</em>}
        </div>

        {score === 0 && <p className="hint">Score at least 1 point to enter the leaderboard.</p>}

        {submission.status === 'needs-name' && (
          <form
            className="name-form"
            onSubmit={(e) => {
              e.preventDefault()
              if (name.trim()) onSubmitName(name.trim())
            }}
          >
            <label htmlFor="bird-name">Name on the board</label>
            <div className="name-form__row">
              <input
                id="bird-name"
                ref={inputRef}
                value={name}
                maxLength={14}
                placeholder="e.g. Skyhawk"
                onChange={(e) => setName(e.target.value)}
              />
              <button type="submit" className="btn btn--small" disabled={!name.trim()}>
                Save
              </button>
            </div>
          </form>
        )}

        {submission.status === 'saving' && <p className="saved-line">Saving to the leaderboard…</p>}
        {submission.status === 'saved' && (
          <p className="saved-line saved-line--ok">
            ✓ Saved{savedName ? ` as ${savedName}` : ''}
            {submission.rank ? ` · world #${submission.rank}` : ''}
          </p>
        )}
        {submission.status === 'error' && (
          <p className="saved-line saved-line--err">Couldn&apos;t reach the leaderboard — your run is safe locally.</p>
        )}

        <div className="card__actions">
          <button className="btn btn--primary" onClick={onRetry}>
            Fly again
          </button>
          {canSubmit && submission.status === 'error' && (
            <button className="btn btn--ghost" onClick={() => onSubmitName(savedName || 'Anonymous')}>
              Retry save
            </button>
          )}
        </div>
        <p className="hint">
          best <b>{best}</b> · <kbd>Space</kbd> to retry
        </p>
      </div>
    </div>
  )
}

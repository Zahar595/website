import { useEffect, useState } from 'react'

const RANK_BADGES = ['🥇', '🥈', '🥉']

function ago(ts) {
  if (!ts) return 'connecting…'
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000))
  if (s < 5) return 'updated just now'
  if (s < 60) return `updated ${s}s ago`
  return `updated ${Math.round(s / 60)}m ago`
}

export default function Leaderboard({ rows, live, status, updatedAt, onToggle, open, myId }) {
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const visible = rows.slice(0, 10)

  return (
    <aside className={`board ${open ? 'is-open' : ''}`} data-ui>
      <button className="board__head" onClick={onToggle} aria-expanded={open}>
        <span className={`board__status board__status--${status}`}>
          <i className="dot" />
          {status === 'live' ? 'LIVE' : status === 'connecting' ? 'SYNC' : status.toUpperCase()}
        </span>
        <span className="board__title">Leaderboard</span>
        <span className="board__chev">{open ? '▾' : '▸'}</span>
      </button>

      <div className="board__body">
        {visible.length === 0 ? (
          <p className="board__empty">Loading the flock…</p>
        ) : (
          <ol className="board__list">
            {visible.map((row) => (
              <li
                key={row.id}
                className={`row ${row.local ? 'row--me' : ''} ${row.score >= 25 ? 'row--hot' : ''}`}
              >
                <span className="row__rank">{RANK_BADGES[row.rank - 1] ?? row.rank}</span>
                <span className="row__name" title={row.name}>
                  {row.name}
                </span>
                <span className="row__score">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
        <footer className="board__foot">
          <span className="board__live-count">
            <b>{live || 0}</b> {live === 1 ? 'bird' : 'birds'} flying now
          </span>
          <span className="board__updated">{ago(updatedAt)}</span>
        </footer>
      </div>
    </aside>
  )
}

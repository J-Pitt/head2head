'use client'

import { useEffect, useRef } from 'react'
import type { GameViewProps } from '@/lib/minigames/types'
import {
  FROGGER_COLS,
  FROGGER_ROWS,
  FROGGER_WIN_SCORE,
  TRAFFIC_LANES,
  carPositions,
  frogHitByTraffic,
  moveFrog,
  type FroggerState,
} from '@/lib/minigames/frogger'
import { avatarEmoji } from '@/lib/avatars'
import { useGameTick } from '../MinigameRouter'

export function FroggerView({ state, players, playerId, pushState, tick }: GameViewProps) {
  const s = state as FroggerState
  const lastHit = useRef(0)
  const elapsed = s.startedAt ? (Date.now() - s.startedAt) / 1000 : 0

  useEffect(() => {
    if (!s.started || s.winnerId) return
    const frog = s.frogs[playerId]
    if (!frog?.alive) return
    if (!frogHitByTraffic(frog.col, frog.row, elapsed)) return
    if (Date.now() - lastHit.current < 900) return
    lastHit.current = Date.now()
    pushState(moveFrog(s, playerId, 0, 0, elapsed))
  }, [tick, s, playerId, elapsed, pushState])

  function tryMove(dCol: number, dRow: number) {
    pushState(moveFrog(s, playerId, dCol, dRow, elapsed))
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.repeat) return
      if (e.key === 'ArrowUp') tryMove(0, -1)
      else if (e.key === 'ArrowDown') tryMove(0, 1)
      else if (e.key === 'ArrowLeft') tryMove(-1, 0)
      else if (e.key === 'ArrowRight') tryMove(1, 0)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const my = s.frogs[playerId]

  return (
    <div className="frogger-shell">
      <div className="frogger-board-wrap">
        <div
          className="frogger-board"
          style={{
            gridTemplateColumns: `repeat(${FROGGER_COLS}, 1fr)`,
            gridTemplateRows: `repeat(${FROGGER_ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: FROGGER_ROWS * FROGGER_COLS }).map((_, i) => {
            const row = Math.floor(i / FROGGER_COLS)
            const col = i % FROGGER_COLS
            const lane = TRAFFIC_LANES.find((l) => l.row === row)
            let carHere = false
            if (lane) {
              carHere = carPositions(lane, elapsed).some((head) => {
                for (let j = 0; j < lane.length; j++) if (head + j * lane.dir === col) return true
                return false
              })
            }
            const frogsHere = players.filter((p) => {
              const f = s.frogs[p.id]
              return f?.alive && f.col === col && f.row === row
            })
            let cls = 'frogger-cell'
            if (row === 0) cls += ' goal'
            else if (lane) cls += ' road'
            else if (row === FROGGER_ROWS - 1) cls += ' start'
            else cls += ' safe'
            return (
              <div key={i} className={cls}>
                {carHere && <span className="frogger-car">🚗</span>}
                {frogsHere.map((p) => (
                  <span key={p.id} className={`frogger-frog ${p.id === playerId ? 'mine' : ''}`}>
                    {avatarEmoji(p.avatar)}
                  </span>
                ))}
              </div>
            )
          })}
        </div>
      </div>
      <div className="frogger-controls">
        <p className="frogger-hint">
          Lives: {my?.lives ?? 0} · Score: {my?.score ?? 0}/{FROGGER_WIN_SCORE}
        </p>
        <div className="dpad">
          <button type="button" className="dpad-btn" onClick={() => tryMove(0, -1)}>
            ▲
          </button>
          <div className="dpad-mid">
            <button type="button" className="dpad-btn" onClick={() => tryMove(-1, 0)}>
              ◀
            </button>
            <button type="button" className="dpad-btn" onClick={() => tryMove(0, 1)}>
              ▼
            </button>
            <button type="button" className="dpad-btn" onClick={() => tryMove(1, 0)}>
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

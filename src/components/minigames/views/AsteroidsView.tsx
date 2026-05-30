'use client'

import { useGameTick } from '../MinigameRouter'
import type { GameViewProps } from '@/lib/minigames/types'
import { asteroidsThrust, asteroidsTick } from '@/lib/minigames/asteroids'
import { avatarEmoji } from '@/lib/avatars'

export function AsteroidsView({ state, players, playerId, pushState, isHost }: GameViewProps) {
  const ships = state.ships as Record<string, { x: number; y: number; alive: boolean }>
  const rocks = state.rocks as { x: number; y: number; r: number }[]
  const scores = state.scores as Record<string, number>

  useGameTick(state.started && !state.winnerId && isHost, () => {
    pushState(asteroidsTick(state))
  }, 80)

  return (
    <div className="arcade-view">
      <div className="asteroids-field">
        {rocks.map((r, i) => (
          <span key={i} className="asteroid" style={{ left: `${r.x}%`, top: `${r.y}%`, width: r.r * 2, height: r.r * 2 }}>🪨</span>
        ))}
        {players.map((p) => {
          const s = ships[p.id]
          if (!s?.alive) return null
          return (
            <span key={p.id} className={`ship ${p.id === playerId ? 'mine' : ''}`} style={{ left: `${s.x}%`, top: `${s.y}%` }}>
              {avatarEmoji(p.avatar)}
            </span>
          )
        })}
      </div>
      <p className="arcade-hint">Rocks destroyed: {scores[playerId] ?? 0} / {state.winScore as number}</p>
      <div className="dpad-mid">
        <button type="button" className="dpad-btn" onClick={() => pushState(asteroidsThrust(state, playerId, 0, -1))}>▲</button>
        <button type="button" className="dpad-btn" onClick={() => pushState(asteroidsThrust(state, playerId, -1, 0))}>◀</button>
        <button type="button" className="dpad-btn" onClick={() => pushState(asteroidsThrust(state, playerId, 1, 0))}>▶</button>
        <button type="button" className="dpad-btn" onClick={() => pushState(asteroidsThrust(state, playerId, 0, 1))}>▼</button>
      </div>
    </div>
  )
}

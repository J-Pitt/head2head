'use client'

import { useGameTick } from '../MinigameRouter'
import type { GameViewProps } from '@/lib/minigames/types'
import { pongMovePaddle, pongTick } from '@/lib/minigames/pong'

export function PongView({ state, players, playerId, pushState, isHost }: GameViewProps) {
  const ball = state.ball as { x: number; y: number }
  const paddles = state.paddles as Record<string, number>
  const scores = state.scores as Record<string, number>

  useGameTick(state.started && !state.winnerId && isHost, () => {
    pushState(pongTick(state))
  }, 50)

  const ids = players.map((p) => p.id)
  const isLeft = playerId === ids[0]

  return (
    <div className="arcade-view">
      <div className="pong-court">
        <div className="pong-paddle left" style={{ top: `${paddles[ids[0]] ?? 40}%` }} />
        <div className="pong-paddle right" style={{ top: `${paddles[ids[1] ?? ids[0]] ?? 40}%` }} />
        <div className="pong-ball" style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
      </div>
      <p className="arcade-hint">
        {players.map((p) => `${p.name}: ${scores[p.id] ?? 0}`).join(' · ')}
      </p>
      <div className="pong-controls">
        <button type="button" className="btn" onClick={() => pushState(pongMovePaddle(state, playerId, (paddles[playerId] ?? 50) - 8))}>↑</button>
        <button type="button" className="btn" onClick={() => pushState(pongMovePaddle(state, playerId, (paddles[playerId] ?? 50) + 8))}>↓</button>
      </div>
      <p className="arcade-hint">{isLeft ? 'You: left paddle' : 'You: right paddle'}</p>
    </div>
  )
}

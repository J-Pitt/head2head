'use client'

import { useGameTick } from '../MinigameRouter'
import type { GameViewProps } from '@/lib/minigames/types'
import { breakoutMovePaddle, breakoutTick } from '@/lib/minigames/breakout'

export function BreakoutView({ state, playerId, pushState, isHost }: GameViewProps) {
  const ball = state.ball as { x: number; y: number }
  const bricks = state.bricks as boolean[]
  const paddles = state.paddles as Record<string, number>
  const scores = state.scores as Record<string, number>

  useGameTick(state.started && !state.winnerId && isHost, () => {
    pushState(breakoutTick(state))
  }, 50)

  return (
    <div className="arcade-view">
      <div className="breakout-board">
        <div className="breakout-bricks">
          {bricks.map((on, i) => (
            <div key={i} className={`breakout-brick ${on ? 'on' : 'off'}`} />
          ))}
        </div>
        <div className="breakout-ball" style={{ left: `${ball.x}%`, top: `${ball.y}%` }} />
        {Object.entries(paddles).map(([id, x]) => (
          <div key={id} className={`breakout-paddle ${id === playerId ? 'mine' : ''}`} style={{ left: `${x}%` }} />
        ))}
      </div>
      <p className="arcade-hint">Score: {scores[playerId] ?? 0} / {state.winScore as number}</p>
      <div className="pong-controls">
        <button type="button" className="btn" onClick={() => pushState(breakoutMovePaddle(state, playerId, (paddles[playerId] ?? 50) - 10))}>◀</button>
        <button type="button" className="btn" onClick={() => pushState(breakoutMovePaddle(state, playerId, (paddles[playerId] ?? 50) + 10))}>▶</button>
      </div>
    </div>
  )
}

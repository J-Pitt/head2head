import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

export function createBreakoutState(players: Player[]): MinigameState {
  const bricks: boolean[] = Array.from({ length: 40 }, () => true)
  const paddles: Record<string, number> = {}
  const scores: Record<string, number> = {}
  players.forEach((p, i) => {
    paddles[p.id] = 40 + i * 5
    scores[p.id] = 0
  })
  return {
    started: false,
    startedAt: 0,
    ball: { x: 50, y: 70, vx: 0.3, vy: -0.35 },
    paddles,
    scores,
    bricks,
    activePlayer: players[0]?.id,
    winScore: 15,
  }
}

export function startBreakoutState(state: MinigameState) {
  return startBase(state)
}

export function breakoutMovePaddle(state: MinigameState, playerId: string, x: number): MinigameState {
  const paddles = { ...(state.paddles as Record<string, number>) }
  paddles[playerId] = Math.max(10, Math.min(90, x))
  return { ...state, paddles, activePlayer: playerId }
}

export function breakoutTick(state: MinigameState): MinigameState {
  if (!state.started || state.winnerId) return state
  const ball = { ...(state.ball as { x: number; y: number; vx: number; vy: number }) }
  ball.x += ball.vx
  ball.y += ball.vy
  if (ball.x <= 2 || ball.x >= 98) ball.vx *= -1
  if (ball.y <= 5) ball.vy *= -1

  const active = state.activePlayer as string
  const py = (state.paddles as Record<string, number>)[active] ?? 50
  if (ball.y >= 88 && Math.abs(ball.x - py) < 15) {
    ball.vy = -Math.abs(ball.vy)
    ball.vx += (ball.x - py) * 0.01
  }
  if (ball.y >= 100) {
    ball.x = 50
    ball.y = 70
    ball.vy = -0.35
  }

  const bricks = [...(state.bricks as boolean[])]
  const scores = { ...(state.scores as Record<string, number>) }
  const col = Math.floor((ball.x / 100) * 8)
  const row = Math.floor((ball.y / 60) * 5)
  if (row >= 0 && row < 5 && col >= 0 && col < 8) {
    const idx = row * 8 + col
    if (bricks[idx]) {
      bricks[idx] = false
      ball.vy *= -1
      scores[active] = (scores[active] ?? 0) + 1
    }
  }

  let winnerId = state.winnerId ?? null
  if ((scores[active] ?? 0) >= (state.winScore as number)) winnerId = active
  if (bricks.every((b) => !b) && !winnerId) winnerId = active

  return { ...state, ball, bricks, scores, winnerId }
}

import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

export function createPongState(players: Player[]): MinigameState {
  const paddles: Record<string, number> = {}
  players.forEach((p, i) => {
    paddles[p.id] = 40 + i * 15
  })
  const scores: Record<string, number> = {}
  players.forEach((p) => (scores[p.id] = 0))
  return {
    started: false,
    startedAt: 0,
    ball: { x: 50, y: 50, vx: 0.35, vy: 0.25 },
    paddles,
    scores,
    winScore: 5,
  }
}

export function startPongState(state: MinigameState) {
  return startBase(state)
}

export function pongTick(state: MinigameState): MinigameState {
  if (!state.started || state.winnerId) return state
  const ball = { ...(state.ball as { x: number; y: number; vx: number; vy: number }) }
  ball.x += ball.vx
  ball.y += ball.vy
  if (ball.y <= 2 || ball.y >= 98) ball.vy *= -1
  if (ball.x <= 2) ball.vx = Math.abs(ball.vx)
  if (ball.x >= 98) ball.vx = -Math.abs(ball.vx)
  return { ...state, ball }
}

export function pongMovePaddle(state: MinigameState, playerId: string, y: number): MinigameState {
  const paddles = { ...(state.paddles as Record<string, number>) }
  paddles[playerId] = Math.max(5, Math.min(85, y))
  const ball = { ...(state.ball as { x: number; y: number; vx: number; vy: number }) }
  const py = paddles[playerId]
  if (Math.abs(ball.y - py) < 12 && ((ball.x < 15 && playerId === Object.keys(paddles)[0]) || ball.x > 85)) {
    ball.vx *= -1.05
    ball.vy += (ball.y - py) * 0.02
  }
  const scores = { ...(state.scores as Record<string, number>) }
  let winnerId = state.winnerId ?? null
  if (ball.x <= 0) {
    const ids = Object.keys(scores)
    const scorer = ids[1] ?? ids[0]
    scores[scorer] = (scores[scorer] ?? 0) + 1
    if (scores[scorer] >= (state.winScore as number)) winnerId = scorer
    ball.x = 50
    ball.y = 50
  }
  if (ball.x >= 100) {
    const ids = Object.keys(scores)
    scores[ids[0]] = (scores[ids[0]] ?? 0) + 1
    if (scores[ids[0]] >= (state.winScore as number)) winnerId = ids[0]
    ball.x = 50
    ball.y = 50
  }
  return { ...state, paddles, ball, scores, winnerId }
}

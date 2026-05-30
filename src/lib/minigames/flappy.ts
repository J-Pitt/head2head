import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

export function createFlappyState(players: Player[]): MinigameState {
  const birds: Record<string, { y: number; vy: number; alive: boolean; score: number }> = {}
  players.forEach((p) => {
    birds[p.id] = { y: 50, vy: 0, alive: true, score: 0 }
  })
  return {
    started: false,
    startedAt: 0,
    birds,
    pipeX: 100,
    pipeGap: 35,
    pipeTop: 30 + Math.random() * 30,
    winScore: 5,
  }
}

export function startFlappyState(state: MinigameState) {
  return startBase(state)
}

export function flappyFlap(state: MinigameState, playerId: string): MinigameState {
  const birds = { ...(state.birds as Record<string, { y: number; vy: number; alive: boolean; score: number }>) }
  const b = birds[playerId]
  if (!b?.alive || state.winnerId) return state
  b.vy = -4
  birds[playerId] = b
  return { ...state, birds }
}

export function flappyTick(state: MinigameState): MinigameState {
  if (!state.started || state.winnerId) return state
  const birds = { ...(state.birds as Record<string, { y: number; vy: number; alive: boolean; score: number }>) }
  let pipeX = (state.pipeX as number) - 0.8
  let pipeTop = state.pipeTop as number
  const gap = state.pipeGap as number

  if (pipeX < -10) {
    pipeX = 100
    pipeTop = 20 + Math.random() * 40
    for (const id of Object.keys(birds)) {
      const b = birds[id]
      if (b.alive) {
        b.score += 1
        birds[id] = b
      }
    }
  }

  let winnerId = state.winnerId ?? null
  for (const id of Object.keys(birds)) {
    const b = birds[id]
    if (!b.alive) continue
    b.vy += 0.35
    b.y += b.vy * 0.15
    if (b.y <= 0 || b.y >= 100) b.alive = false
    if (pipeX > 8 && pipeX < 18 && (b.y < pipeTop || b.y > pipeTop + gap)) b.alive = false
    if (b.score >= (state.winScore as number)) winnerId = id
    birds[id] = b
  }

  return { ...state, birds, pipeX, pipeTop, winnerId }
}

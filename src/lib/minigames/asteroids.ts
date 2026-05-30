import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

export function createAsteroidsState(players: Player[]): MinigameState {
  const ships: Record<string, { x: number; y: number; vx: number; vy: number; alive: boolean }> = {}
  players.forEach((p, i) => {
    ships[p.id] = { x: 20 + i * 30, y: 50, vx: 0, vy: 0, alive: true }
  })
  const rocks = [
    { x: 60, y: 30, r: 8 },
    { x: 75, y: 60, r: 10 },
    { x: 40, y: 70, r: 7 },
  ]
  return { started: false, startedAt: 0, ships, rocks, scores: Object.fromEntries(players.map((p) => [p.id, 0])), winScore: 3 }
}

export function startAsteroidsState(state: MinigameState) {
  return startBase(state)
}

export function asteroidsThrust(state: MinigameState, playerId: string, ax: number, ay: number): MinigameState {
  const ships = { ...(state.ships as Record<string, { x: number; y: number; vx: number; vy: number; alive: boolean }>) }
  const s = ships[playerId]
  if (!s?.alive) return state
  s.vx = Math.max(-2, Math.min(2, s.vx + ax * 0.15))
  s.vy = Math.max(-2, Math.min(2, s.vy + ay * 0.15))
  ships[playerId] = s
  return { ...state, ships }
}

export function asteroidsTick(state: MinigameState): MinigameState {
  if (!state.started || state.winnerId) return state
  const ships = { ...(state.ships as Record<string, { x: number; y: number; vx: number; vy: number; alive: boolean }>) }
  const scores = { ...(state.scores as Record<string, number>) }
  let rocks = [...(state.rocks as { x: number; y: number; r: number }[])]

  for (const id of Object.keys(ships)) {
    const s = ships[id]
    if (!s.alive) continue
    s.x = (s.x + s.vx + 100) % 100
    s.y = (s.y + s.vy + 100) % 100
    s.vx *= 0.98
    s.vy *= 0.98
    for (let i = rocks.length - 1; i >= 0; i--) {
      const r = rocks[i]
      const dx = s.x - r.x
      const dy = s.y - r.y
      if (Math.hypot(dx, dy) < r.r + 3) {
        rocks.splice(i, 1)
        scores[id] = (scores[id] ?? 0) + 1
      }
    }
    ships[id] = s
  }

  let winnerId = state.winnerId ?? null
  for (const [id, sc] of Object.entries(scores)) {
    if (sc >= (state.winScore as number)) winnerId = id
  }
  if (rocks.length === 0 && !winnerId) {
    const top = Object.entries(scores).sort((a, b) => b[1] - a[1])[0]
    if (top) winnerId = top[0]
  }

  return { ...state, ships, rocks, scores, winnerId }
}

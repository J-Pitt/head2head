import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

export function createReactionState(players: Player[]): MinigameState {
  return {
    started: false,
    startedAt: 0,
    phase: 'waiting',
    goAt: 0,
    clicks: {} as Record<string, number>,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    winScore: 3,
  }
}

export function startReactionState(state: MinigameState) {
  const s = startBase(state)
  return { ...s, phase: 'ready', goAt: Date.now() + 2000 + Math.random() * 3000 }
}

export function reactionClick(state: MinigameState, playerId: string): MinigameState {
  const phase = state.phase as string
  const clicks = { ...(state.clicks as Record<string, number>) }
  if (clicks[playerId] != null) return state

  if (phase === 'ready') {
    clicks[playerId] = -1
    return { ...state, clicks, phase: 'early', winnerId: null }
  }
  if (phase === 'go') {
    clicks[playerId] = Date.now() - (state.goAt as number)
    const allClicked = Object.keys(state.scores as Record<string, number>).every((id) => clicks[id] != null)
    if (allClicked) {
      const entries = Object.entries(clicks).filter(([, v]) => v >= 0).sort((a, b) => a[1] - b[1])
      const winner = entries[0]?.[0]
      const scores = { ...(state.scores as Record<string, number>) }
      if (winner) scores[winner] = (scores[winner] ?? 0) + 1
      let winnerId = state.winnerId ?? null
      if (winner && scores[winner] >= (state.winScore as number)) winnerId = winner
      return { ...state, clicks, scores, phase: 'done', winnerId }
    }
    return { ...state, clicks }
  }
  return state
}

export function reactionTick(state: MinigameState): MinigameState {
  if ((state.phase as string) === 'ready' && Date.now() >= (state.goAt as number)) {
    return { ...state, phase: 'go' }
  }
  if ((state.phase as string) === 'done' || (state.phase as string) === 'early') {
    return {
      ...state,
      phase: 'ready',
      goAt: Date.now() + 2000 + Math.random() * 3000,
      clicks: {},
    }
  }
  return state
}

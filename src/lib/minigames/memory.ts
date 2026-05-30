import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

const EMOJIS = ['🐸', '🚀', '🎮', '⭐', '🍕', '🎵', '🌈', '🔥']

export function createMemoryState(players: Player[]): MinigameState {
  const pairs = [...EMOJIS.slice(0, 8), ...EMOJIS.slice(0, 8)]
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pairs[i], pairs[j]] = [pairs[j], pairs[i]]
  }
  const scores: Record<string, number> = {}
  players.forEach((p) => (scores[p.id] = 0))
  return {
    started: false,
    startedAt: 0,
    cards: pairs,
    flipped: [] as number[],
    matched: [] as number[],
    turnIndex: 0,
    playerOrder: players.map((p) => p.id),
    scores,
    winScore: 4,
  }
}

export function startMemoryState(state: MinigameState) {
  return startBase(state)
}

export function memoryFlip(state: MinigameState, playerId: string, idx: number): MinigameState {
  const matched = [...(state.matched as number[])]
  if (matched.includes(idx) || state.winnerId) return state
  const order = state.playerOrder as string[]
  const turnIndex = state.turnIndex as number
  if (order[turnIndex % order.length] !== playerId) return state

  let flipped = [...(state.flipped as number[])]
  if (flipped.includes(idx) || flipped.length >= 2) return state
  flipped.push(idx)

  const scores = { ...(state.scores as Record<string, number>) }
  let turn = turnIndex
  let winnerId = state.winnerId ?? null

  if (flipped.length === 2) {
    const [a, b] = flipped
    const cards = state.cards as string[]
    if (cards[a] === cards[b]) {
      matched.push(a, b)
      scores[playerId] = (scores[playerId] ?? 0) + 1
      flipped = []
      if (scores[playerId] >= (state.winScore as number)) winnerId = playerId
    } else {
      turn += 1
    }
  }

  return { ...state, flipped, matched, scores, turnIndex: turn, winnerId }
}

export function memoryClearFlip(state: MinigameState): MinigameState {
  const flipped = state.flipped as number[]
  if (flipped.length !== 2) return state
  const [a, b] = flipped
  const cards = state.cards as string[]
  if (cards[a] === cards[b]) return state
  return { ...state, flipped: [], turnIndex: (state.turnIndex as number) + 1 }
}

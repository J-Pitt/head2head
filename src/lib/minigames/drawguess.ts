import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

const WORDS = ['rocket', 'planet', 'galaxy', 'python', 'matrix', 'pixel', 'dragon', 'castle', 'wizard', 'comet']

export function createDrawGuessState(players: Player[]): MinigameState {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
  return {
    started: false,
    startedAt: 0,
    round: 0,
    drawerIndex: 0,
    playerOrder: players.map((p) => p.id),
    secretWord: word,
    strokes: [] as { x: number; y: number }[][],
    guesses: {} as Record<string, string>,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    winScore: 3,
  }
}

export function startDrawGuessState(state: MinigameState) {
  return startBase(state)
}

export function drawGuessAddStroke(state: MinigameState, playerId: string, points: { x: number; y: number }[]): MinigameState {
  const order = state.playerOrder as string[]
  const drawer = order[(state.drawerIndex as number) % order.length]
  if (drawer !== playerId) return state
  const strokes = [...(state.strokes as { x: number; y: number }[][]), points]
  return { ...state, strokes }
}

export function drawGuessSubmit(state: MinigameState, playerId: string, guess: string): MinigameState {
  const order = state.playerOrder as string[]
  const drawer = order[(state.drawerIndex as number) % order.length]
  if (playerId === drawer || state.winnerId) return state
  const guesses = { ...(state.guesses as Record<string, string>) }
  guesses[playerId] = guess.trim().toLowerCase()
  const secret = (state.secretWord as string).toLowerCase()
  const scores = { ...(state.scores as Record<string, number>) }
  let winnerId = state.winnerId ?? null
  if (guess.trim().toLowerCase() === secret) {
    scores[playerId] = (scores[playerId] ?? 0) + 1
    scores[drawer] = (scores[drawer] ?? 0) + 1
    let winnerId = state.winnerId ?? null
    if (scores[playerId] >= (state.winScore as number)) winnerId = playerId
    return {
      ...state,
      guesses: {},
      strokes: [],
      secretWord: WORDS[Math.floor(Math.random() * WORDS.length)],
      drawerIndex: ((state.drawerIndex as number) + 1) % order.length,
      round: (state.round as number) + 1,
      scores,
      winnerId,
    }
  }
  return { ...state, guesses, scores, winnerId }
}

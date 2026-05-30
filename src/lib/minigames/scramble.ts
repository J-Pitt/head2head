import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

const WORDS = ['science', 'trivia', 'nebula', 'quantum', 'friends', 'nirvana', 'matrix', 'pokemon', 'tamagotchi', 'macarena']

function scramble(w: string): string {
  const arr = w.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const s = arr.join('')
  return s === w ? scramble(w) : s
}

export function createScrambleState(players: Player[]): MinigameState {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
  return {
    started: false,
    startedAt: 0,
    word,
    scrambled: scramble(word),
    answers: {} as Record<string, string>,
    scores: Object.fromEntries(players.map((p) => [p.id, 0])),
    winScore: 3,
    round: 1,
  }
}

export function startScrambleState(state: MinigameState) {
  return startBase(state)
}

export function scrambleSubmit(state: MinigameState, playerId: string, answer: string): MinigameState {
  const answers = { ...(state.answers as Record<string, string>) }
  if (answers[playerId]) return state
  answers[playerId] = answer.trim().toLowerCase()
  const word = (state.word as string).toLowerCase()
  const scores = { ...(state.scores as Record<string, number>) }
  let winnerId = state.winnerId ?? null

  if (answer.trim().toLowerCase() === word) {
    scores[playerId] = (scores[playerId] ?? 0) + 1
    if (scores[playerId] >= (state.winScore as number)) winnerId = playerId
    const nextWord = WORDS[Math.floor(Math.random() * WORDS.length)]
    return {
      ...state,
      answers: {},
      word: nextWord,
      scrambled: scramble(nextWord),
      round: (state.round as number) + 1,
      scores,
      winnerId,
    }
  }

  return { ...state, answers, scores, winnerId }
}

export function scrambleNextRound(state: MinigameState): MinigameState {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)]
  return { ...state, answers: {}, word, scrambled: scramble(word), round: (state.round as number) + 1 }
}

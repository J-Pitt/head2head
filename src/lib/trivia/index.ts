import type { CategoryId, GameMode, GameState, Player } from '../types'
import { NINETIES_QUESTIONS } from './nineties'
import { SCIENCE_QUESTIONS } from './science'

export const CATEGORIES = [
  { id: 'science' as const, label: 'Science', icon: '🔬' },
  { id: 'nineties' as const, label: "90's Pop Culture", icon: '📼' },
]

export const TRIVIA_QUESTIONS = [...SCIENCE_QUESTIONS, ...NINETIES_QUESTIONS]

export const BUZZ_WINDOW_SEC = 12
export const ANSWER_WINDOW_SEC = 18
export const TURN_ANSWER_SEC = 25
export const QUESTIONS_PER_GAME = 12

export function questionsForCategories(categories: CategoryId[]) {
  const pool = TRIVIA_QUESTIONS.filter((q) => categories.includes(q.category))
  return shuffle([...pool]).slice(0, Math.min(QUESTIONS_PER_GAME, pool.length))
}

export function getQuestionById(id: string) {
  return TRIVIA_QUESTIONS.find((q) => q.id === id)
}

export function createInitialGameState(
  players: Player[],
  categories: CategoryId[],
  gameMode: GameMode
): GameState {
  const picked = questionsForCategories(categories)
  const scores: Record<string, number> = {}
  for (const p of players) scores[p.id] = 0

  const phase = gameMode === 'buzzer' ? 'buzzing' : 'question'

  return {
    gameStarted: true,
    gameMode,
    categories,
    questionIds: picked.map((q) => q.id),
    questionIndex: 0,
    currentPlayerIndex: 0,
    scores,
    phase,
    phaseStartedAt: Date.now(),
    buzzWindowSec: BUZZ_WINDOW_SEC,
    answerWindowSec: ANSWER_WINDOW_SEC,
    turnAnswerSec: TURN_ANSWER_SEC,
    buzzedBy: null,
  }
}

export function nextPlayerIndex(current: number, total: number) {
  if (total <= 0) return 0
  return (current + 1) % total
}

export function phaseDeadline(state: GameState): number {
  const start = state.phaseStartedAt
  if (state.phase === 'buzzing') return start + state.buzzWindowSec * 1000
  if (state.phase === 'answering') return start + state.answerWindowSec * 1000
  if (state.phase === 'question') return start + state.turnAnswerSec * 1000
  return start
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

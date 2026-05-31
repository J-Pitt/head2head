import { firstActiveIndex } from '../players'
import type { CategoryId, GameMode, GameState, JeopardyClue, Player, TriviaQuestion } from '../types'
import { ANIMALS_QUESTIONS } from './animals'
import { GENERAL_QUESTIONS } from './general'
import { HISTORY_QUESTIONS } from './history'
import { LITERATURE_QUESTIONS } from './literature'
import { POPCULTURE_QUESTIONS } from './popculture'
import { SCIENCE_QUESTIONS } from './science'

export const CATEGORIES = [
  { id: 'science' as const, label: 'Science', icon: '🔬' },
  { id: 'popculture' as const, label: 'Pop Culture', icon: '🎬' },
  { id: 'literature' as const, label: 'Literature', icon: '📚' },
  { id: 'animals' as const, label: 'Animals', icon: '🐾' },
  { id: 'history' as const, label: 'History', icon: '🏛️' },
  { id: 'general' as const, label: 'General', icon: '🌎' },
]

export const TRIVIA_QUESTIONS = [
  ...SCIENCE_QUESTIONS,
  ...POPCULTURE_QUESTIONS,
  ...LITERATURE_QUESTIONS,
  ...ANIMALS_QUESTIONS,
  ...HISTORY_QUESTIONS,
  ...GENERAL_QUESTIONS,
]

/** Pick a trivia question not yet used this board game. */
export function pickRandomQuestion(usedIds: string[]): TriviaQuestion | null {
  if (TRIVIA_QUESTIONS.length === 0) return null
  const used = new Set(usedIds)
  const available = TRIVIA_QUESTIONS.filter((q) => !used.has(q.id))
  if (available.length === 0) return null
  return available[Math.floor(Math.random() * available.length)]
}

export const JEOPARDY_VALUES = [200, 400, 600, 800, 1000] as const

export const BUZZ_WINDOW_SEC = 12
export const ANSWER_WINDOW_SEC = 18
export const TURN_ANSWER_SEC = 25

export function getCategoryMeta(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!
}

export function questionsForCategory(category: CategoryId) {
  return TRIVIA_QUESTIONS.filter((q) => q.category === category)
}

export function getQuestionById(id: string) {
  return TRIVIA_QUESTIONS.find((q) => q.id === id)
}

export function getClueById(state: GameState, clueId: string | null | undefined) {
  if (!clueId) return null
  return state.clues.find((c) => c.id === clueId) ?? null
}

export function getActiveQuestion(state: GameState) {
  const clue = getClueById(state, state.activeClueId)
  return clue ? getQuestionById(clue.questionId) : null
}

export function buildJeopardyBoard(categories: CategoryId[]): JeopardyClue[] {
  const clues: JeopardyClue[] = []
  for (const category of categories) {
    const pool = shuffle([...questionsForCategory(category)])
    for (let i = 0; i < JEOPARDY_VALUES.length; i++) {
      const q = pool[i % pool.length]
      const value = JEOPARDY_VALUES[i]
      clues.push({
        id: `${category}-${value}`,
        category,
        value,
        questionId: q.id,
      })
    }
  }
  return clues
}

export function isGameComplete(state: GameState) {
  return (
    state.clues.length > 0 &&
    state.usedClueIds.length >= state.clues.length &&
    state.phase === 'reveal' &&
    !state.activeClueId
  )
}

export function createInitialGameState(
  players: Player[],
  categories: CategoryId[],
  gameMode: GameMode
): GameState {
  const clues = buildJeopardyBoard(categories)
  const scores: Record<string, number> = {}
  for (const p of players) scores[p.id] = 0

  return {
    gameStarted: true,
    gameMode,
    categories: [...categories],
    clues,
    usedClueIds: [],
    activeClueId: null,
    currentPlayerIndex: firstActiveIndex(players),
    scores,
    phase: 'board',
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

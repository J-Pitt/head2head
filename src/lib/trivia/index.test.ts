import { describe, expect, it } from 'vitest'
import {
  buildJeopardyBoard,
  getCategoryMeta,
  getQuestionById,
  isGameComplete,
  phaseDeadline,
  questionsForCategory,
  valueForDifficulty,
} from '@/lib/trivia'
import { player } from '@/lib/__tests__/helpers'
import { createInitialGameState } from '@/lib/trivia'

describe('trivia', () => {
  it('buildJeopardyBoard creates 5 clues per category with tiered values', () => {
    const clues = buildJeopardyBoard(['science', 'general'])
    expect(clues).toHaveLength(10)
    expect(clues.filter((c) => c.value === 200)).toHaveLength(2)
    expect(clues.filter((c) => c.value === 1000)).toHaveLength(2)
    for (const clue of clues) {
      const q = getQuestionById(clue.questionId)
      expect(q).toBeTruthy()
      expect(clue.value).toBe(valueForDifficulty(q!.difficulty, 'single'))
    }
  })

  it('buildJeopardyBoard double round uses doubled values and alternate questions', () => {
    const single = buildJeopardyBoard(['science'], 'single')
    const usedIds = single.map((c) => c.questionId)
    const double = buildJeopardyBoard(['science'], 'double', usedIds)
    expect(double).toHaveLength(5)
    expect(double.every((c) => c.value >= 400)).toBe(true)
    expect(double.every((c) => !usedIds.includes(c.questionId))).toBe(true)
  })

  it('getQuestionById resolves known ids', () => {
    const pool = questionsForCategory('science')
    const q = getQuestionById(pool[0]!.id)
    expect(q?.category).toBe('science')
    expect(q?.difficulty).toBeGreaterThanOrEqual(1)
  })

  it('getCategoryMeta returns label', () => {
    expect(getCategoryMeta('science').label).toBe('Science')
  })

  it('phaseDeadline extends by buzz window', () => {
    const state = createInitialGameState([player('a')], ['science'], 'buzzer')
    const buzzing = { ...state, phase: 'buzzing' as const, phaseStartedAt: 1000 }
    expect(phaseDeadline(buzzing)).toBe(1000 + state.buzzWindowSec * 1000)
  })

  it('isGameComplete only after double jeopardy', () => {
    const state = createInitialGameState([player('a')], ['science'], 'buzzer')
    const singleDone = {
      ...state,
      usedClueIds: state.clues.map((c) => c.id),
      phase: 'reveal' as const,
      activeClueId: null,
    }
    expect(isGameComplete(singleDone)).toBe(false)

    const doubleDone = {
      ...singleDone,
      jeopardyRound: 'double' as const,
    }
    expect(isGameComplete(doubleDone)).toBe(true)
  })
})

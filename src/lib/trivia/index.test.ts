import { describe, expect, it } from 'vitest'
import {
  buildJeopardyBoard,
  getCategoryMeta,
  getQuestionById,
  isGameComplete,
  phaseDeadline,
  questionsForCategory,
} from '@/lib/trivia'
import { player } from '@/lib/__tests__/helpers'
import { createInitialGameState } from '@/lib/trivia'

describe('trivia', () => {
  it('buildJeopardyBoard creates 5 clues per category', () => {
    const clues = buildJeopardyBoard(['science', 'general'])
    expect(clues).toHaveLength(10)
    expect(clues.every((c) => c.value >= 200)).toBe(true)
  })

  it('getQuestionById resolves known ids', () => {
    const pool = questionsForCategory('science')
    const q = getQuestionById(pool[0]!.id)
    expect(q?.category).toBe('science')
  })

  it('getCategoryMeta returns label', () => {
    expect(getCategoryMeta('science').label).toBe('Science')
  })

  it('phaseDeadline extends by buzz window', () => {
    const state = createInitialGameState([player('a')], ['science'], 'buzzer')
    const buzzing = { ...state, phase: 'buzzing' as const, phaseStartedAt: 1000 }
    expect(phaseDeadline(buzzing)).toBe(1000 + state.buzzWindowSec * 1000)
  })

  it('isGameComplete when all clues used', () => {
    const state = createInitialGameState([player('a')], ['science'], 'buzzer')
    const done = {
      ...state,
      usedClueIds: state.clues.map((c) => c.id),
      phase: 'reveal' as const,
      activeClueId: null,
    }
    expect(isGameComplete(done)).toBe(true)
  })
})

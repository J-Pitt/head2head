import { describe, expect, it } from 'vitest'
import {
  advanceRound,
  applyAnswer,
  applyBuzz,
  applyTimeout,
  selectClue,
} from '@/lib/gameLogic'
import { getClueById, getQuestionById } from '@/lib/trivia'
import { baseGameState, player } from '@/lib/__tests__/helpers'

describe('gameLogic', () => {
  const players = [player('a', 'Alice'), player('b', 'Bob')]

  it('selectClue moves to buzzing in buzzer mode', () => {
    const state = baseGameState(players, ['science'], 'buzzer', { phase: 'board' })
    const clueId = state.clues[0]!.id
    const next = selectClue(state, clueId, players)
    expect(next.phase).toBe('buzzing')
    expect(next.activeClueId).toBe(clueId)
    expect(next.buzzedBy).toBeNull()
  })

  it('selectClue rejects used clues', () => {
    const base = baseGameState(players, ['science'], 'buzzer', { phase: 'board' })
    const clueId = base.clues[0]!.id
    const state = { ...base, usedClueIds: [clueId] }
    const same = selectClue(state, clueId, players)
    expect(same).toBe(state)
  })

  it('applyBuzz awards answering phase to first buzzer', () => {
    let state = baseGameState(players, ['science'], 'buzzer', { phase: 'board' })
    state = selectClue(state, state.clues[0]!.id, players)
    const next = applyBuzz(state, 'b', players)
    expect(next.phase).toBe('answering')
    expect(next.buzzedBy).toBe('b')
  })

  it('applyAnswer adds clue value on correct buzzer answer', () => {
    let state = baseGameState(players, ['science'], 'buzzer', { phase: 'board' })
    const clueId = state.clues[0]!.id
    state = selectClue(state, clueId, players)
    state = applyBuzz(state, 'a', players)
    const clue = getClueById(state, clueId)!
    const q = getQuestionById(clue.questionId)!
    const next = applyAnswer(state, 'a', q.correctIndex, q.correctIndex)
    expect(next.phase).toBe('reveal')
    expect(next.scores.a).toBe(clue.value)
  })

  it('applyTimeout on buzzing ends with no answer', () => {
    let state = baseGameState(players, ['science'], 'buzzer', { phase: 'board' })
    state = selectClue(state, state.clues[0]!.id, players)
    state = { ...state, phaseStartedAt: Date.now() - state.buzzWindowSec * 1000 - 1 }
    const next = applyTimeout(state, players)
    expect(next.phase).toBe('reveal')
    expect(next.lastAnswer).toBeUndefined()
  })

  it('advanceRound returns to board after reveal', () => {
    let state = baseGameState(players, ['science'], 'buzzer', { phase: 'board' })
    const clueId = state.clues[0]!.id
    state = selectClue(state, clueId, players)
    state = {
      ...state,
      phase: 'reveal',
      lastAnswer: { playerId: 'a', correct: true, choiceIndex: 0 },
      usedClueIds: [],
    }
    const next = advanceRound(state, players)
    expect(next.phase).toBe('board')
    expect(next.usedClueIds).toContain(clueId)
    expect(next.activeClueId).toBeNull()
  })
})

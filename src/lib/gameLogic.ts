import { createInitialGameState, phaseDeadline } from './trivia'
import { isActivePlayer, nextActivePlayerIndex, normalizeToActiveIndex } from './players'
import type { CategoryId, GameMode, GameState, Player } from './types'

export function applyBuzz(state: GameState, playerId: string, players: Player[]): GameState {
  const me = players.find((p) => p.id === playerId)
  if (!me || !isActivePlayer(me)) return state
  if (state.phase !== 'buzzing' || state.buzzedBy) return state
  return {
    ...state,
    buzzedBy: playerId,
    phase: 'answering',
    phaseStartedAt: Date.now(),
  }
}

export function applyAnswer(
  state: GameState,
  playerId: string,
  choiceIndex: number,
  correctIndex: number
): GameState {
  const correct = choiceIndex === correctIndex
  const scores = { ...state.scores }
  if (correct) scores[playerId] = (scores[playerId] ?? 0) + 1
  return {
    ...state,
    scores,
    phase: 'reveal',
    lastAnswer: { playerId, correct, choiceIndex },
  }
}

export function applyTimeout(state: GameState, players: Player[]): GameState {
  const now = Date.now()
  const deadline = phaseDeadline(state)
  if (now < deadline) return state

  if (state.phase === 'buzzing') {
    return {
      ...state,
      phase: 'reveal',
      lastAnswer: undefined,
      phaseStartedAt: now,
    }
  }

  if (state.phase === 'answering' && state.buzzedBy) {
    return {
      ...state,
      phase: 'reveal',
      lastAnswer: { playerId: state.buzzedBy, correct: false, choiceIndex: -1 },
      phaseStartedAt: now,
    }
  }

  if (state.phase === 'question') {
    let idx = normalizeToActiveIndex(players, state.currentPlayerIndex ?? 0)
    const current = players[idx]
    if (!current || !isActivePlayer(current)) {
      return { ...state, phase: 'reveal', phaseStartedAt: now }
    }
    return {
      ...state,
      phase: 'reveal',
      lastAnswer: { playerId: current.id, correct: false, choiceIndex: -1 },
      phaseStartedAt: now,
    }
  }

  return state
}

export function advanceRound(state: GameState, players: Player[]): GameState | null {
  const nextQIndex = state.questionIndex + 1
  if (nextQIndex >= state.questionIds.length) {
    return { ...state, phase: 'reveal', questionIndex: nextQIndex }
  }

  const nextPlayer =
    state.gameMode === 'turns'
      ? nextActivePlayerIndex(players, state.currentPlayerIndex ?? 0)
      : state.currentPlayerIndex
  const phase = state.gameMode === 'buzzer' ? 'buzzing' : 'question'

  return {
    ...state,
    questionIndex: nextQIndex,
    currentPlayerIndex: nextPlayer,
    phase,
    phaseStartedAt: Date.now(),
    buzzedBy: null,
    lastAnswer: undefined,
  }
}

export function startNewGame(
  players: Player[],
  categories: CategoryId[],
  gameMode: GameMode
): GameState {
  return createInitialGameState(players, categories, gameMode)
}

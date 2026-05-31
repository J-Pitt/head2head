import { createInitialGameState, getClueById, phaseDeadline, transitionToDoubleJeopardy } from './trivia'
import { isActivePlayer, nextActivePlayerIndex, normalizeToActiveIndex } from './players'
import type { CategoryId, GameMode, GameState, Player } from './types'

export function selectClue(state: GameState, clueId: string, players: Player[]): GameState {
  if (state.phase !== 'board') return state
  if (state.usedClueIds.includes(clueId)) return state
  const picker = players[state.currentPlayerIndex]
  if (!picker || !isActivePlayer(picker)) return state

  const phase = state.gameMode === 'buzzer' ? 'buzzing' : 'question'
  return {
    ...state,
    activeClueId: clueId,
    phase,
    phaseStartedAt: Date.now(),
    buzzedBy: null,
    lastAnswer: undefined,
  }
}

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
  const clue = getClueById(state, state.activeClueId)
  const value = clue?.value ?? 200
  const correct = choiceIndex === correctIndex
  const scores = { ...state.scores }
  if (correct) scores[playerId] = (scores[playerId] ?? 0) + value
  else scores[playerId] = (scores[playerId] ?? 0) - value
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
    const clue = getClueById(state, state.activeClueId)
    const value = clue?.value ?? 200
    const scores = { ...state.scores }
    scores[state.buzzedBy] = (scores[state.buzzedBy] ?? 0) - value
    return {
      ...state,
      scores,
      phase: 'reveal',
      lastAnswer: { playerId: state.buzzedBy, correct: false, choiceIndex: -1 },
      phaseStartedAt: now,
    }
  }

  if (state.phase === 'question') {
    const idx = normalizeToActiveIndex(players, state.currentPlayerIndex ?? 0)
    const current = players[idx]
    if (!current || !isActivePlayer(current)) {
      return { ...state, phase: 'reveal', phaseStartedAt: now }
    }
    const clue = getClueById(state, state.activeClueId)
    const value = clue?.value ?? 200
    const scores = { ...state.scores }
    scores[current.id] = (scores[current.id] ?? 0) - value
    return {
      ...state,
      scores,
      phase: 'reveal',
      lastAnswer: { playerId: current.id, correct: false, choiceIndex: -1 },
      phaseStartedAt: now,
    }
  }

  return state
}

export function advanceRound(state: GameState, players: Player[]): GameState {
  const used = state.activeClueId
    ? [...state.usedClueIds, state.activeClueId]
    : state.usedClueIds

  const allDone = used.length >= state.clues.length

  if (allDone) {
    if ((state.jeopardyRound ?? 'single') === 'single') {
      return transitionToDoubleJeopardy({ ...state, usedClueIds: used })
    }
    return {
      ...state,
      usedClueIds: used,
      activeClueId: null,
      phase: 'reveal',
      phaseStartedAt: Date.now(),
      buzzedBy: null,
      lastAnswer: undefined,
    }
  }

  const wasCorrect = state.lastAnswer?.correct === true
  let nextPlayer = state.currentPlayerIndex

  if (state.gameMode === 'turns') {
    if (!wasCorrect) {
      nextPlayer = nextActivePlayerIndex(players, state.currentPlayerIndex ?? 0)
    }
  } else {
    nextPlayer = nextActivePlayerIndex(players, state.currentPlayerIndex ?? 0)
  }

  return {
    ...state,
    usedClueIds: used,
    activeClueId: null,
    currentPlayerIndex: nextPlayer,
    phase: 'board',
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

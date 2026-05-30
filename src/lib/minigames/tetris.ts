import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

export function createTetrisState(players: Player[]): MinigameState {
  const boards: Record<string, number[][]> = {}
  const scores: Record<string, number> = {}
  players.forEach((p) => {
    boards[p.id] = Array.from({ length: 12 }, () => Array(8).fill(0))
    scores[p.id] = 0
  })
  return { started: false, startedAt: 0, boards, scores, pieces: Object.fromEntries(players.map((p) => [p.id, 3])), winScore: 5 }
}

export function startTetrisState(state: MinigameState) {
  return startBase(state)
}

export function tetrisMove(state: MinigameState, playerId: string, dx: number): MinigameState {
  const pieces = { ...(state.pieces as Record<string, number>) }
  pieces[playerId] = Math.max(0, Math.min(7, (pieces[playerId] ?? 3) + dx))
  return { ...state, pieces }
}

export function tetrisDrop(state: MinigameState, playerId: string): MinigameState {
  const boards = { ...(state.boards as Record<string, number[][]>) }
  const board = boards[playerId].map((r) => [...r])
  const col = (state.pieces as Record<string, number>)[playerId] ?? 3
  let placed = false
  for (let row = 11; row >= 0; row--) {
    if (board[row][col] === 0) {
      board[row][col] = 1
      placed = true
      break
    }
  }
  if (!placed) return state

  let cleared = 0
  for (let row = 11; row >= 0; row--) {
    if (board[row].every((c) => c === 1)) {
      board.splice(row, 1)
      board.unshift(Array(8).fill(0))
      cleared++
      row++
    }
  }

  const scores = { ...(state.scores as Record<string, number>) }
  scores[playerId] = (scores[playerId] ?? 0) + cleared
  boards[playerId] = board
  let winnerId = state.winnerId ?? null
  if (scores[playerId] >= (state.winScore as number)) winnerId = playerId
  return { ...state, boards, scores, winnerId }
}

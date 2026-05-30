import type { Player } from '@/lib/types'
import type { MinigameState } from './types'
import { startBase } from './types'

const COLS = 7
const ROWS = 6

export function createConnect4State(players: Player[]): MinigameState {
  return {
    started: false,
    startedAt: 0,
    board: Array.from({ length: ROWS }, () => Array(COLS).fill('')),
    playerOrder: players.map((p) => p.id),
    turnIndex: 0,
    colors: Object.fromEntries(players.map((p, i) => [p.id, i === 0 ? 'R' : 'Y'])),
  }
}

export function startConnect4State(state: MinigameState) {
  return startBase(state)
}

export function connect4Drop(state: MinigameState, playerId: string, col: number): MinigameState {
  const order = state.playerOrder as string[]
  const turn = state.turnIndex as number
  if (order[turn % order.length] !== playerId || state.winnerId) return state
  if (col < 0 || col >= COLS) return state

  const board = (state.board as string[][]).map((r) => [...r])
  let row = -1
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r][col] === '') {
      row = r
      break
    }
  }
  if (row === -1) return state

  const color = (state.colors as Record<string, string>)[playerId]
  board[row][col] = color

  let winnerId: string | null = null
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]]
  for (const [dr, dc] of dirs) {
    let count = 1
    for (const sign of [1, -1]) {
      for (let i = 1; i < 4; i++) {
        const nr = row + dr * i * sign
        const nc = col + dc * i * sign
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === color) count++
        else break
      }
    }
    if (count >= 4) winnerId = playerId
  }

  return { ...state, board, turnIndex: turn + 1, winnerId }
}

export { COLS as CONNECT4_COLS, ROWS as CONNECT4_ROWS }

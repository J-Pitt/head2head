import type { BoardState } from './board'
import { isClassicTodState, type ClassicTodState } from './classic/types'

export type { ClassicTodState } from './classic/types'
export { isClassicTodState, initialClassicTodState } from './classic/types'

export type TodPhase = 'lobby' | 'turn' | 'picture' | 'board'
export type TodMode = 'classic' | 'board'

export type BoardTodState = {
  phase: TodPhase
  mode: TodMode
  round: number
  turnOrder: string[]
  turnIndex: number
  onSpotId: string | null
  askerId: string | null
  choice: 'truth' | 'dare' | null
  prompt: string | null
  board: BoardState | null
}

export type TodState = BoardTodState | ClassicTodState

export function isBoardTodState(state: unknown): state is BoardTodState {
  return !!state && typeof state === 'object' && !isClassicTodState(state)
}

export function initialTodState(): BoardTodState {
  return {
    phase: 'lobby',
    mode: 'board',
    round: 0,
    turnOrder: [],
    turnIndex: 0,
    onSpotId: null,
    askerId: null,
    choice: null,
    prompt: null,
    board: null,
  }
}

// Picture time is triggered after every Nth completed round.
export const PICTURE_EVERY = 3

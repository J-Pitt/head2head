import type { BoardState } from './board'

export type TodPhase = 'lobby' | 'turn' | 'picture' | 'board'
export type TodMode = 'classic' | 'board'

export type TodState = {
  phase: TodPhase
  mode: TodMode
  round: number
  // Turn tracking for the classic truth-or-dare phase.
  turnOrder: string[]
  turnIndex: number
  onSpotId: string | null
  askerId: string | null
  choice: 'truth' | 'dare' | null
  prompt: string | null
  // Board game state (null in classic mode).
  board: BoardState | null
}

export function initialTodState(): TodState {
  return {
    phase: 'lobby',
    mode: 'classic',
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

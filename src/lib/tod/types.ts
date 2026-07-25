import type { TodDeckId } from './prompts'

export type TodPhase = 'lobby' | 'turn' | 'picture'

export type TodState = {
  phase: TodPhase
  round: number
  // Turn tracking for the truth-or-dare phase.
  turnOrder: string[]
  turnIndex: number
  onSpotId: string | null
  askerId: string | null
  choice: 'truth' | 'dare' | null
  prompt: string | null
  // Which prompt decks feed the "surprise me" generator.
  decks: TodDeckId[]
}

export function initialTodState(): TodState {
  return {
    phase: 'lobby',
    round: 0,
    turnOrder: [],
    turnIndex: 0,
    onSpotId: null,
    askerId: null,
    choice: null,
    prompt: null,
    decks: ['party'],
  }
}

// Picture time is triggered after every Nth completed round.
export const PICTURE_EVERY = 3

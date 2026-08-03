import type { ClassicListMode } from './lists'

export type ClassicTodState = {
  phase: 'classic'
  mode: 'classic'
  subPhase: 'lobby' | 'playing'
  listMode: ClassicListMode
  turnIndex: number
  turnOrder: string[]
  turnPhase: 'choose' | 'answer'
  chosenCategory: 'truth' | 'dare' | null
  prompt: string | null
  onSpotId: string | null
  usedTruths: number[]
  usedDares: number[]
}

export function initialClassicTodState(listMode: ClassicListMode = 'pg'): ClassicTodState {
  return {
    phase: 'classic',
    mode: 'classic',
    subPhase: 'lobby',
    listMode,
    turnIndex: 0,
    turnOrder: [],
    turnPhase: 'choose',
    chosenCategory: null,
    prompt: null,
    onSpotId: null,
    usedTruths: [],
    usedDares: [],
  }
}

export function isClassicTodState(state: unknown): state is ClassicTodState {
  return !!state && typeof state === 'object' && (state as ClassicTodState).phase === 'classic'
}

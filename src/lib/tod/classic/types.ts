import type { ClassicListMode } from './lists'

export type ClassicTodState = {
  phase: 'classic'
  mode: 'classic'
  subPhase: 'lobby' | 'playing'
  listMode: ClassicListMode
  turnIndex: number
  turnOrder: string[]
  waitingForChoice: boolean
  chosenCategory: 'truth' | 'dare' | null
  prompt: string | null
  onSpotId: string | null
  usedTruths: number[]
  usedDares: number[]
}

export function initialClassicTodState(listMode: ClassicListMode = 'sexy'): ClassicTodState {
  return {
    phase: 'classic',
    mode: 'classic',
    subPhase: 'lobby',
    listMode,
    turnIndex: 0,
    turnOrder: [],
    waitingForChoice: false,
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

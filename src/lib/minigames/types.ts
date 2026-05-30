import type { Player } from '@/lib/types'

export type BaseGameState = {
  started: boolean
  startedAt: number
  winnerId?: string | null
  winnerName?: string | null
}

export type MinigameState = BaseGameState & Record<string, unknown>

export type GameViewProps = {
  state: MinigameState
  players: Player[]
  playerId: string
  isHost: boolean
  pushState: (next: MinigameState) => void
  tick: number
}

export function startBase<T extends MinigameState>(state: T): T {
  return { ...state, started: true, startedAt: Date.now(), winnerId: null, winnerName: null }
}

export function setWinner<T extends MinigameState>(state: T, winnerId: string, winnerName: string): T {
  return { ...state, winnerId, winnerName }
}

export function elapsed(state: MinigameState) {
  return state.started && state.startedAt ? (Date.now() - state.startedAt) / 1000 : 0
}

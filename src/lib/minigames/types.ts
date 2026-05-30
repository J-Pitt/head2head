import type { Player } from '@/lib/types'
import type { MinigameId } from './catalog'

// How a game synchronizes between players.
//  - race:     everyone plays their own board locally; we broadcast score/alive.
//  - turn:     a single shared board, players take turns (Connect 4).
//  - reaction: everyone waits for a shared "GO!" then reports reaction time.
export type SyncMode = 'race' | 'turn' | 'reaction'

export type RoundStatus = 'lobby' | 'live' | 'over'

// Lightweight per-player progress — written to its own Redis hash field so
// concurrent updates from many players never clobber each other.
export type Progress = {
  playerId: string
  score: number
  alive: boolean
  finished: boolean
  finishAt: number | null
  at: number
}

export type Connect4Session = {
  // 7 columns x 6 rows, row-major from top; 0 = empty, otherwise (playerIndex + 1)
  board: number[]
  turnPlayerId: string
  lastCol: number | null
}

// Shared, low-frequency lifecycle state for a round. Only the host (or, for a
// turn game, the player taking their turn) writes this.
export type Session = {
  // Which game the room is currently playing. null = everyone's in the hub
  // choosing the next game.
  gameId: MinigameId | null
  status: RoundStatus
  mode: SyncMode
  round: number
  startAt: number | null
  endAt: number | null
  seed: number
  goAt?: number | null
  connect4?: Connect4Session | null
  winnerId?: string | null
  winnerName?: string | null
}

export function hubSession(round = 0): Session {
  return {
    gameId: null,
    status: 'lobby',
    mode: 'race',
    round,
    startAt: null,
    endAt: null,
    seed: 0,
    winnerId: null,
    winnerName: null,
  }
}

export type ProgressMap = Record<string, Progress>

export type GameViewProps = {
  session: Session
  players: Player[]
  progress: ProgressMap
  playerId: string
  isHost: boolean
  report: (p: Partial<Omit<Progress, 'playerId' | 'at'>>) => void
  setSession: (partial: Partial<Session>) => void
  startRound: () => void
  now: number
}

export type { MinigameId }

import type { MinigameId } from '@/lib/minigames/catalog'
import type { Session } from '@/lib/minigames/types'

export type TodPhase = 'lobby' | 'minigame' | 'forfeit' | 'turn'

export type TodState = {
  phase: TodPhase
  round: number
  // Embedded minigame lifecycle (reuses the minigame engine).
  minigame: Session | null
  minigameId: MinigameId | null
  // Loser of the most recent minigame (owes the forfeit).
  loserId: string | null
  loserName: string | null
  // Turn tracking for the truth-or-dare phase.
  turnOrder: string[]
  turnIndex: number
  onSpotId: string | null
  askerId: string | null
  choice: 'truth' | 'dare' | null
  prompt: string | null
}

export function initialTodState(): TodState {
  return {
    phase: 'lobby',
    round: 0,
    minigame: null,
    minigameId: null,
    loserId: null,
    loserName: null,
    turnOrder: [],
    turnIndex: 0,
    onSpotId: null,
    askerId: null,
    choice: null,
    prompt: null,
  }
}

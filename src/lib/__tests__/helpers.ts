import type { CategoryId, GameMode, GameState, Player } from '@/lib/types'
import { createInitialGameState } from '@/lib/trivia'

export function player(id: string, name = id, status: Player['status'] = 'active'): Player {
  return { id, name, avatar: 'car', status }
}

export function baseGameState(
  players: Player[],
  categories: CategoryId[] = ['science'],
  gameMode: GameMode = 'buzzer',
  patch: Partial<GameState> = {}
): GameState {
  const state = createInitialGameState(players, categories, gameMode)
  const clueId = state.clues[0]?.id
  return {
    ...state,
    activeClueId: clueId ?? null,
    ...patch,
  }
}

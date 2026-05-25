import type { Player } from './types'

export type PlayerStatus = 'active' | 'break'

export function isActivePlayer(p: Player) {
  return p.status !== 'break'
}

export function activePlayers(players: Player[]) {
  return players.filter(isActivePlayer)
}

export function firstActiveIndex(players: Player[]) {
  const i = players.findIndex(isActivePlayer)
  return i >= 0 ? i : 0
}

/** Next seat index (in full players array) that is not on break */
export function nextActivePlayerIndex(players: Player[], fromIndex: number) {
  const n = players.length
  if (n === 0) return 0
  for (let step = 1; step <= n; step++) {
    const idx = (fromIndex + step) % n
    if (isActivePlayer(players[idx])) return idx
  }
  return fromIndex
}

/** If index points at a player on break, advance to next active */
export function normalizeToActiveIndex(players: Player[], index: number) {
  const p = players[index]
  if (p && isActivePlayer(p)) return index
  return nextActivePlayerIndex(players, index)
}

import { describe, expect, it } from 'vitest'
import {
  activePlayers,
  firstActiveIndex,
  isActivePlayer,
  nextActivePlayerIndex,
  normalizeToActiveIndex,
} from '@/lib/players'
import { player } from '@/lib/__tests__/helpers'

describe('players', () => {
  const players = [
    player('a'),
    { ...player('b'), status: 'break' as const },
    player('c'),
  ]

  it('filters active players', () => {
    expect(activePlayers(players)).toHaveLength(2)
    expect(isActivePlayer(players[1]!)).toBe(false)
  })

  it('firstActiveIndex skips break', () => {
    expect(firstActiveIndex([players[1]!, players[2]!])).toBe(1)
  })

  it('nextActivePlayerIndex wraps and skips break', () => {
    expect(nextActivePlayerIndex(players, 0)).toBe(2)
    expect(nextActivePlayerIndex(players, 2)).toBe(0)
  })

  it('normalizeToActiveIndex advances from break seat', () => {
    expect(normalizeToActiveIndex(players, 1)).toBe(2)
  })
})

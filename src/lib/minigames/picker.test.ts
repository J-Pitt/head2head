import { describe, expect, it } from 'vitest'
import { awardPartyWin, hubPickerId, hubSession, nextPickerId, partyWinBoard } from '@/lib/minigames/types'

const players = [
  { id: 'a', name: 'Alex', avatar: 'av1' },
  { id: 'b', name: 'Blake', avatar: 'av2' },
  { id: 'c', name: 'Casey', avatar: 'av3' },
]

describe('minigame picker rotation', () => {
  it('hubPickerId defaults to first player when unset', () => {
    expect(hubPickerId(null, players)).toBe('a')
    expect(hubPickerId(hubSession(), players)).toBe('a')
  })

  it('hubPickerId uses session picker when valid', () => {
    expect(hubPickerId(hubSession(0, 'b'), players)).toBe('b')
  })

  it('nextPickerId rotates through players', () => {
    expect(nextPickerId(players, 'a')).toBe('b')
    expect(nextPickerId(players, 'b')).toBe('c')
    expect(nextPickerId(players, 'c')).toBe('a')
  })

  it('awardPartyWin increments winner tally', () => {
    expect(awardPartyWin({}, 'a')).toEqual({ a: 1 })
    expect(awardPartyWin({ a: 1 }, 'a')).toEqual({ a: 2 })
    expect(awardPartyWin({ a: 2 }, 'b')).toEqual({ a: 2, b: 1 })
  })

  it('partyWinBoard sorts by wins', () => {
    const board = partyWinBoard(players, { a: 2, b: 0, c: 5 })
    expect(board.map((r) => r.player.id)).toEqual(['c', 'a', 'b'])
  })
})

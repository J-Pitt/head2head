import { describe, expect, it } from 'vitest'
import {
  BOARD_COLS,
  BOARD_ROWS,
  buildTiles,
  createBoardState,
  LAST_TILE,
  SPECIAL_CHALLENGES,
} from '@/lib/tod/board'
import { player } from '@/lib/__tests__/helpers'

describe('tod board', () => {
  it('buildTiles has start and finish', () => {
    const tiles = buildTiles()
    expect(tiles[0]!.type).toBe('start')
    expect(tiles[tiles.length - 1]!.type).toBe('finish')
    expect(tiles.length).toBe(BOARD_COLS * BOARD_ROWS)
  })

  it('special tiles reference challenges cyclically', () => {
    const specials = buildTiles().filter((t) => t.type === 'special')
    expect(specials.length).toBeGreaterThan(0)
    expect(specials[0]!.special).toBe(0)
    expect(SPECIAL_CHALLENGES.length).toBeGreaterThan(0)
  })

  it('createBoardState places everyone at start', () => {
    const b = createBoardState([player('a'), player('b')])
    expect(b.positions.a).toBe(0)
    expect(b.positions.b).toBe(0)
    expect(b.phase).toBe('rolling')
    expect(b.order.length).toBe(2)
  })

  it('LAST_TILE is final index', () => {
    const b = createBoardState([player('a')])
    expect(LAST_TILE(b)).toBe(b.tiles.length - 1)
  })
})

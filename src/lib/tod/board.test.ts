import { describe, expect, it } from 'vitest'
import {
  BOARD_COLS,
  BOARD_PATH_LENGTH,
  BOARD_ROWS,
  buildTiles,
  createBoardState,
  LAST_TILE,
  SPECIAL_CHALLENGES,
} from '@/lib/tod/board'
import { player } from '@/lib/__tests__/helpers'

describe('tod board', () => {
  it('buildTiles has start and finish on a perimeter path', () => {
    const tiles = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: false })
    expect(tiles[0]!.type).toBe('start')
    expect(tiles[tiles.length - 1]!.type).toBe('finish')
    expect(tiles.length).toBe(BOARD_PATH_LENGTH)
    // Start bottom-left, finish on left edge just above start
    expect(tiles[0]).toMatchObject({ row: BOARD_ROWS - 1, col: 0 })
    expect(tiles[tiles.length - 1]).toMatchObject({ row: BOARD_ROWS - 2, col: 0 })
  })

  it('special tiles reference challenges cyclically when not randomized', () => {
    const specials = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: false }).filter(
      (t) => t.type === 'special'
    )
    expect(specials.length).toBeGreaterThan(0)
    expect(specials[0]!.special).toBe(0)
    expect(SPECIAL_CHALLENGES.length).toBeGreaterThan(0)
  })

  it('randomized boards shuffle middle tiles but keep the same mix', () => {
    const fixed = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: false })
      .slice(1, -1)
      .map((t) => t.type)
      .sort()
      .join(',')
    let sawDifferentOrder = false
    for (let n = 0; n < 12; n++) {
      const randomized = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: true })
        .slice(1, -1)
        .map((t) => t.type)
      const sorted = [...randomized].sort().join(',')
      expect(sorted).toBe(fixed)
      const order = randomized.join(',')
      if (order !== fixed) sawDifferentOrder = true
    }
    expect(sawDifferentOrder).toBe(true)
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

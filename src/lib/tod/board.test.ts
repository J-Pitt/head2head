import { describe, expect, it } from 'vitest'
import {
  BOARD_COLS,
  BOARD_PATH_LENGTH,
  BOARD_ROWS,
  buildSpiralWaypoints,
  buildTiles,
  createBoardState,
  LAST_TILE,
  mergeBoardUsedFields,
  SPECIAL_CHALLENGES,
} from '@/lib/tod/board'
import { player } from '@/lib/__tests__/helpers'

describe('tod board', () => {
  it('buildTiles has start and finish on an inward spiral', () => {
    const tiles = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: false })
    expect(tiles[0]!.type).toBe('start')
    expect(tiles[tiles.length - 1]!.type).toBe('finish')
    expect(tiles.length).toBe(BOARD_PATH_LENGTH)
    expect(tiles.length).toBe(BOARD_COLS * BOARD_ROWS)
    // Start bottom-left, finish near the center
    expect(tiles[0]).toMatchObject({ row: BOARD_ROWS - 1, col: 0 })
    const finish = tiles[tiles.length - 1]!
    expect(finish.row).toBeGreaterThanOrEqual(Math.floor(BOARD_ROWS / 2) - 1)
    expect(finish.row).toBeLessThanOrEqual(Math.ceil(BOARD_ROWS / 2))
    expect(finish.col).toBeGreaterThanOrEqual(Math.floor(BOARD_COLS / 2) - 1)
    expect(finish.col).toBeLessThanOrEqual(Math.ceil(BOARD_COLS / 2))
  })

  it('spiral visits every cell once with adjacent steps', () => {
    const path = buildSpiralWaypoints(BOARD_COLS, BOARD_ROWS)
    expect(path.length).toBe(BOARD_COLS * BOARD_ROWS)
    const keys = new Set(path.map((p) => `${p.row},${p.col}`))
    expect(keys.size).toBe(path.length)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!
      const b = path[i]!
      const dist = Math.abs(a.row - b.row) + Math.abs(a.col - b.col)
      expect(dist).toBe(1)
    }
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

  it('mergeBoardUsedFields unions used lists without dropping history', () => {
    const base = createBoardState([player('a')])
    base.usedTruths = [1, 2]
    base.usedPromptTexts = ['First prompt']
    const merged = mergeBoardUsedFields(base, {
      usedTruths: [2, 3],
      usedPromptTexts: ['first prompt', 'Second prompt'],
    })
    expect(merged.usedTruths?.sort()).toEqual([1, 2, 3])
    expect(merged.usedPromptTexts).toEqual(['First prompt', 'Second prompt'])
  })
})

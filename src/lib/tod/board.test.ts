import { describe, expect, it } from 'vitest'
import {
  BOARD_COLS,
  BOARD_PATH_LENGTH,
  BOARD_ROWS,
  buildTiles,
  createBoardState,
  LAST_TILE,
  SPECIAL_CHALLENGES,
  getBoardDisplayLayout,
  splitZigzagLegs,
  ZIGZAG_RUN_WIDTH,
  zigzagCourseCoords,
} from '@/lib/tod/board'
import { player } from '@/lib/__tests__/helpers'

function adjacent(a: { row: number; col: number }, b: { row: number; col: number }) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1
}

describe('tod board', () => {
  it('buildTiles has start and finish', () => {
    const tiles = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: false })
    expect(tiles[0]!.type).toBe('start')
    expect(tiles[tiles.length - 1]!.type).toBe('finish')
    expect(tiles.length).toBe(BOARD_PATH_LENGTH)
  })

  it('snake display uses grid coords with turns stacked on same column', () => {
    const tiles = buildTiles(BOARD_COLS, BOARD_ROWS, { randomize: false })
    const legs = splitZigzagLegs(tiles)
    expect(legs.length).toBeGreaterThan(4)
    for (let i = 1; i < legs.length; i++) {
      const prevEast = legs[i - 1]!.length === 1 || legs[i - 1]![1]!.col > legs[i - 1]![0]!.col
      const currEast = legs[i]!.length === 1 || legs[i]![1]!.col > legs[i]![0]!.col
      if (legs[i - 1]!.length > 1 && legs[i]!.length > 1) {
        expect(prevEast).not.toBe(currEast)
      }
    }
    const layout = getBoardDisplayLayout(tiles)
    expect(layout.spanCols).toBe(ZIGZAG_RUN_WIDTH)
    expect(layout.spanRows).toBeLessThan(BOARD_ROWS)
    expect(tiles.length).toBe(BOARD_PATH_LENGTH)

    const turnEnd = legs[0]!.at(-1)!
    const turnStart = legs[1]![0]!
    expect(layout.displayCol(turnEnd)).toBe(layout.displayCol(turnStart))
    expect(layout.displayRow(turnStart)).toBe(layout.displayRow(turnEnd) - 1)
  })

  it('zig-zag path is connected with unique tiles', () => {
    const coords = zigzagCourseCoords(BOARD_COLS, BOARD_ROWS, BOARD_PATH_LENGTH)
    expect(coords.length).toBe(BOARD_PATH_LENGTH)
    expect(new Set(coords.map((c) => `${c.row},${c.col}`)).size).toBe(BOARD_PATH_LENGTH)
    for (let i = 1; i < coords.length; i++) {
      expect(adjacent(coords[i - 1]!, coords[i]!)).toBe(true)
    }
    expect(coords[0]!.row).toBe(BOARD_ROWS - 1)
    expect(coords[0]!.col).toBe(0)
    expect(coords[coords.length - 1]!.row).toBeLessThan(BOARD_ROWS - 1)
    expect(Math.max(...coords.map((c) => c.col))).toBeLessThan(ZIGZAG_RUN_WIDTH)
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

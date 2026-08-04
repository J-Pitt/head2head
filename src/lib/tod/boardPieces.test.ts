import { describe, expect, it } from 'vitest'
import {
  BOARD_PIECES,
  DEFAULT_BOARD_PIECE,
  getBoardPiece,
  isBoardPiece,
} from '@/lib/tod/boardPieces'

describe('boardPieces', () => {
  it('offers four vehicle tokens', () => {
    expect(BOARD_PIECES).toHaveLength(4)
    expect(BOARD_PIECES.map((p) => p.id)).toEqual(['car', 'boat', 'spaceship', 'plane'])
  })

  it('default piece is car', () => {
    expect(DEFAULT_BOARD_PIECE).toBe('car')
    expect(isBoardPiece(DEFAULT_BOARD_PIECE)).toBe(true)
  })

  it('getBoardPiece returns known piece', () => {
    expect(getBoardPiece('car').label).toBe('Car')
  })

  it('maps legacy duck id to boat', () => {
    expect(getBoardPiece('duck').id).toBe('boat')
  })

  it('getBoardPiece maps unknown id to stable piece', () => {
    const a = getBoardPiece('legacy-seed-xyz')
    const b = getBoardPiece('legacy-seed-xyz')
    expect(a.id).toBe(b.id)
    expect(BOARD_PIECES.some((p) => p.id === a.id)).toBe(true)
  })
})

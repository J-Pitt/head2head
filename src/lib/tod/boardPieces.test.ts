import { describe, expect, it } from 'vitest'
import {
  BOARD_PIECES,
  DEFAULT_BOARD_PIECE,
  getBoardPiece,
  isBoardPiece,
} from '@/lib/tod/boardPieces'

describe('boardPieces', () => {
  it('default piece exists', () => {
    expect(isBoardPiece(DEFAULT_BOARD_PIECE)).toBe(true)
  })

  it('getBoardPiece returns known piece', () => {
    expect(getBoardPiece('duck').emoji).toBe('🦆')
  })

  it('getBoardPiece maps unknown id to stable piece', () => {
    const a = getBoardPiece('legacy-seed-xyz')
    const b = getBoardPiece('legacy-seed-xyz')
    expect(a.id).toBe(b.id)
    expect(BOARD_PIECES.some((p) => p.id === a.id)).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import {
  initialTodState,
  isBoardTodState,
  PICTURE_EVERY,
} from '@/lib/tod/types'
import { initialClassicTodState, isClassicTodState } from '@/lib/tod/classic/types'

describe('tod types', () => {
  it('initial board state is lobby', () => {
    expect(initialTodState().phase).toBe('lobby')
    expect(initialTodState().mode).toBe('board')
  })

  it('isBoardTodState distinguishes classic', () => {
    expect(isBoardTodState(initialTodState())).toBe(true)
    expect(isBoardTodState(initialClassicTodState())).toBe(false)
  })

  it('isClassicTodState detects classic', () => {
    expect(isClassicTodState(initialClassicTodState())).toBe(true)
    expect(isClassicTodState(initialTodState())).toBe(false)
  })

  it('PICTURE_EVERY is positive', () => {
    expect(PICTURE_EVERY).toBeGreaterThan(0)
  })
})

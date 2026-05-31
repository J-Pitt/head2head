import { describe, expect, it } from 'vitest'
import { mulberry32, seededShuffle } from '@/lib/minigames/rng'

describe('rng', () => {
  it('mulberry32 is deterministic for same seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(a()).toBe(b())
    expect(a()).toBe(b())
  })

  it('seededShuffle is stable per seed', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(seededShuffle(items, 99)).toEqual(seededShuffle(items, 99))
    expect(seededShuffle(items, 99)).not.toEqual(items)
  })

  it('seededShuffle preserves length', () => {
    const items = ['a', 'b', 'c', 'd']
    expect(seededShuffle(items, 1)).toHaveLength(4)
  })
})

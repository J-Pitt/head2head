import { describe, expect, it } from 'vitest'
import {
  getDaresForMode,
  getTruthsForMode,
  pickRandomPrompt,
  PG_DARES,
  PG_TRUTHS,
} from '@/lib/tod/classic/lists'

describe('classic lists', () => {
  it('pg mode uses PG lists', () => {
    expect(getTruthsForMode('pg')[0]).toBe(PG_TRUTHS[0])
    expect(getDaresForMode('pg')[0]).toBe(PG_DARES[0])
  })

  it('nsfw mode uses longer lists', () => {
    expect(getTruthsForMode('nsfw').length).toBeGreaterThan(PG_TRUTHS.length)
  })

  it('pickRandomPrompt avoids used indices', () => {
    const pool = ['a', 'b', 'c']
    const { idx } = pickRandomPrompt(pool, [0, 1])
    expect(idx).toBe(2)
  })

  it('pickRandomPrompt recycles when all used', () => {
    const pool = ['only']
    const { text, idx } = pickRandomPrompt(pool, [0])
    expect(text).toBe('only')
    expect(idx).toBe(0)
  })
})

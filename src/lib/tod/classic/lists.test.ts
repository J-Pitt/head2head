import { describe, expect, it } from 'vitest'
import {
  getDaresForMode,
  getTruthsForMode,
  getDaresForDeck,
  getTruthsForDeck,
  pickPromptChoices,
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

  it('kink deck is separate from standard nsfw', () => {
    expect(getTruthsForDeck('kink').length).toBe(25)
    expect(getDaresForDeck('kink').length).toBe(25)
    expect(getTruthsForDeck('standard')[0]).not.toBe(getTruthsForDeck('kink')[0])
  })

  it('pickRandomPrompt avoids used indices', () => {
    const pool = ['a', 'b', 'c']
    const pick = pickRandomPrompt(pool, [0, 1])
    expect(pick?.idx).toBe(2)
  })

  it('pickRandomPrompt can exclude one index (refresh without reusing same line)', () => {
    const pool = ['a', 'b', 'c']
    const pick = pickRandomPrompt(pool, [], 1)
    expect(pick?.idx).not.toBe(1)
  })

  it('pickRandomPrompt returns null when all used', () => {
    const pool = ['only']
    expect(pickRandomPrompt(pool, [0])).toBeNull()
  })

  it('pickPromptChoices returns up to three distinct options', () => {
    const pool = ['a', 'b', 'c', 'd']
    const picks = pickPromptChoices(pool, [0], 3)
    expect(picks).toHaveLength(3)
    expect(new Set(picks.map((p) => p.idx)).size).toBe(3)
    expect(picks.every((p) => p.idx !== 0)).toBe(true)
  })

  it('pickPromptChoices prefers fresh prompts over ones just shown', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f']
    const picks = pickPromptChoices(pool, [], 3, [0, 1, 2])
    expect(picks).toHaveLength(3)
    expect(picks.every((p) => ![0, 1, 2].includes(p.idx))).toBe(true)
  })

  it('pickPromptChoices skips prompts whose text was already used', () => {
    const pool = ['Hello world', 'Other', 'Third', 'Fourth']
    const picks = pickPromptChoices(pool, [], 3, [], ['hello world'])
    expect(picks.every((p) => p.idx !== 0)).toBe(true)
    expect(picks).toHaveLength(3)
  })
})

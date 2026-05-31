import { describe, expect, it } from 'vitest'
import {
  computeRaceLoser,
  computeRaceWinner,
  getGameConfig,
  isRoundComplete,
} from '@/lib/minigames/registry'
import type { Progress } from '@/lib/minigames/types'
import { player } from '@/lib/__tests__/helpers'

describe('minigame registry', () => {
  const players = [player('a'), player('b')]

  it('getGameConfig returns race settings for frogger', () => {
    const cfg = getGameConfig('frogger')
    expect(cfg.mode).toBe('race')
    expect(cfg.endWhen).toBe('all')
  })

  it('computeRaceWinner picks earliest finisher', () => {
    const cfg = getGameConfig('frogger')
    const progress: Progress[] = [
      { playerId: 'a', score: 10, finished: true, finishAt: 5000, alive: true },
      { playerId: 'b', score: 20, finished: true, finishAt: 3000, alive: true },
    ]
    const w = computeRaceWinner(cfg, players, progress)
    expect(w?.id).toBe('b')
  })

  it('computeRaceLoser picks lowest score in race mode', () => {
    const cfg = getGameConfig('frogger')
    const progress: Progress[] = [
      { playerId: 'a', score: 10, finished: true, finishAt: 1000, alive: true },
      { playerId: 'b', score: 2, finished: true, finishAt: 2000, alive: true },
    ]
    const l = computeRaceLoser(cfg, players, progress)
    expect(l?.id).toBe('b')
  })

  it('isRoundComplete when all players done in endWhen all', () => {
    const cfg = getGameConfig('frogger')
    const progress: Progress[] = [
      { playerId: 'a', score: 1, finished: true, finishAt: 1, alive: true },
      { playerId: 'b', score: 1, finished: true, finishAt: 2, alive: true },
    ]
    expect(isRoundComplete(cfg, players, progress, Date.now(), null)).toBe(true)
  })

  it('reaction winner is fastest (lowest score)', () => {
    const cfg = getGameConfig('reaction')
    const progress: Progress[] = [
      { playerId: 'a', score: 200, finished: true, finishAt: 200, alive: true },
      { playerId: 'b', score: 150, finished: true, finishAt: 150, alive: true },
    ]
    const w = computeRaceWinner(cfg, players, progress)
    expect(w?.id).toBe('b')
  })
})

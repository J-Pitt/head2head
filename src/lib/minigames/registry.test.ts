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
      { playerId: 'a', score: 10, finished: true, finishAt: 5000, alive: true, at: 0 },
      { playerId: 'b', score: 20, finished: true, finishAt: 3000, alive: true, at: 0 },
    ]
    const w = computeRaceWinner(cfg, players, progress)
    expect(w?.id).toBe('b')
  })

  it('computeRaceLoser picks lowest score in race mode', () => {
    const cfg = getGameConfig('frogger')
    const progress: Progress[] = [
      { playerId: 'a', score: 10, finished: true, finishAt: 1000, alive: true, at: 0 },
      { playerId: 'b', score: 2, finished: true, finishAt: 2000, alive: true, at: 0 },
    ]
    const l = computeRaceLoser(cfg, players, progress)
    expect(l?.id).toBe('b')
  })

  it('isRoundComplete when all players done in endWhen all', () => {
    const cfg = getGameConfig('frogger')
    const progress: Progress[] = [
      { playerId: 'a', score: 1, finished: true, finishAt: 1, alive: true, at: 0 },
      { playerId: 'b', score: 1, finished: true, finishAt: 2, alive: true, at: 0 },
    ]
    expect(isRoundComplete(cfg, players, progress, Date.now(), null)).toBe(true)
  })

  it('dino uses race mode like flappy', () => {
    const cfg = getGameConfig('dino')
    expect(cfg.mode).toBe('race')
    expect(cfg.durationMs).toBe(90000)
  })

  it('arcade games breakout meteor pong use race config', () => {
    for (const id of ['breakout', 'meteor', 'pong'] as const) {
      const cfg = getGameConfig(id)
      expect(cfg.mode).toBe('race')
      expect(cfg.endWhen).toBe('all')
      expect(cfg.durationMs).toBe(90000)
    }
  })
})

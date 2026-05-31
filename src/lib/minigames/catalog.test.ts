import { describe, expect, it } from 'vitest'
import { getMinigame, minigamePath, randomTodMinigame, TOD_MINIGAMES, WHEEL_GAMES } from '@/lib/minigames/catalog'

describe('minigame catalog', () => {
  it('TOD_MINIGAMES excludes connect4', () => {
    expect(TOD_MINIGAMES).not.toContain('connect4')
    expect(TOD_MINIGAMES.length).toBeGreaterThan(0)
  })

  it('randomTodMinigame returns valid id', () => {
    expect(TOD_MINIGAMES).toContain(randomTodMinigame())
  })

  it('getMinigame finds wheel entry', () => {
    expect(getMinigame('snake')?.label).toBe('Snake')
  })

  it('minigamePath builds route', () => {
    expect(minigamePath('frogger')).toBe('/minigames/frogger')
  })

  it('every wheel game has metadata', () => {
    expect(WHEEL_GAMES.every((g) => g.emoji && g.label)).toBe(true)
  })
})

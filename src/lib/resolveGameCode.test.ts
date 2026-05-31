import { describe, expect, it } from 'vitest'
import { joinPathForGame, gameLabel } from '@/lib/resolveGameCode'

describe('resolveGameCode', () => {
  it('maps join paths per game', () => {
    expect(joinPathForGame('trivia', 'abc12')).toBe('/?trivia=join&code=ABC12')
    expect(joinPathForGame('tod', 'xyz')).toBe('/truth-or-dare?code=XYZ')
    expect(joinPathForGame('minigame', 'q1')).toBe('/minigames?code=Q1')
  })

  it('labels games for error messages', () => {
    expect(gameLabel('trivia')).toBe('Trivia')
    expect(gameLabel('tod')).toBe('Truth or Dare')
    expect(gameLabel('minigame')).toBe('Mini games')
  })
})

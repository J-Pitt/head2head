import { describe, expect, it } from 'vitest'
import { parseTriviaUrlSearch } from '@/lib/triviaUrl'

describe('triviaUrl', () => {
  it('parses join link', () => {
    const r = parseTriviaUrlSearch('?trivia=join&code=abc123')
    expect(r).toEqual({
      screen: 'setup',
      mode: 'online',
      onlineIntent: 'join',
      gameCodeInput: 'ABC123',
    })
  })

  it('parses create link', () => {
    const r = parseTriviaUrlSearch('?trivia=create&code=xyz')
    expect(r?.onlineIntent).toBe('create')
    expect(r?.gameCodeInput).toBe('XYZ')
  })

  it('returns null without code', () => {
    expect(parseTriviaUrlSearch('?trivia=join')).toBeNull()
  })
})

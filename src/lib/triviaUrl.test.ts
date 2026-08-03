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

  it('parses create link without code', () => {
    const r = parseTriviaUrlSearch('?trivia=create')
    expect(r).toEqual({
      screen: 'setup',
      mode: 'online',
      onlineIntent: 'create',
      gameCodeInput: '',
    })
  })

  it('returns null for join without code', () => {
    expect(parseTriviaUrlSearch('?trivia=join')).toBeNull()
  })
})

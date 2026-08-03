import { describe, expect, it } from 'vitest'
import { parseClassicUrlSearch } from '@/lib/classicUrl'

describe('classicUrl', () => {
  it('parses join', () => {
    expect(parseClassicUrlSearch('?classic=1&code=room1')).toEqual({
      intent: 'join',
      joinCode: 'ROOM1',
    })
  })

  it('parses host create without code', () => {
    expect(parseClassicUrlSearch('?classic=1&host=1')).toEqual({
      intent: 'create',
      joinCode: '',
    })
  })

  it('defaults to solo', () => {
    expect(parseClassicUrlSearch('?classic=1')).toEqual({
      intent: 'solo',
      joinCode: '',
    })
  })

  it('returns null when not classic', () => {
    expect(parseClassicUrlSearch('?trivia=join')).toBeNull()
  })
})

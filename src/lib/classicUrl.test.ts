import { describe, expect, it } from 'vitest'
import { parseClassicUrlSearch } from '@/lib/classicUrl'

describe('classicUrl', () => {
  it('parses join', () => {
    expect(parseClassicUrlSearch('?classic=1&code=room1')).toEqual({
      intent: 'join',
      joinCode: 'ROOM1',
    })
  })

  it('parses create', () => {
    expect(parseClassicUrlSearch('?classic=1&create=new')).toEqual({
      intent: 'create',
      joinCode: 'NEW',
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

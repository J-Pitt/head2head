import { describe, expect, it } from 'vitest'
import { parseBoardTodUrlSearch } from '@/lib/tod/boardUrl'

describe('boardUrl', () => {
  it('parses join code', () => {
    expect(parseBoardTodUrlSearch('?code=abc12')).toEqual({
      entryMode: 'join',
      joinCode: 'ABC12',
    })
  })

  it('parses host create', () => {
    expect(parseBoardTodUrlSearch('?host=1')).toEqual({
      entryMode: 'create',
      joinCode: '',
    })
  })

  it('ignores classic routes', () => {
    expect(parseBoardTodUrlSearch('?classic=1&code=ABC')).toEqual({
      entryMode: null,
      joinCode: '',
    })
  })

  it('join wins over host when both present', () => {
    expect(parseBoardTodUrlSearch('?host=1&code=XYZ')).toEqual({
      entryMode: 'join',
      joinCode: 'XYZ',
    })
  })
})

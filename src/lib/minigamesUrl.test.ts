import { describe, expect, it } from 'vitest'
import { parseMinigamesUrlSearch } from '@/lib/minigamesUrl'

describe('minigamesUrl', () => {
  it('parses join, create, solo, and local intents', () => {
    expect(parseMinigamesUrlSearch('?code=abc12')).toEqual({
      intent: 'join',
      joinCode: 'ABC12',
    })
    expect(parseMinigamesUrlSearch('?host=1')).toEqual({ intent: 'create', joinCode: '' })
    expect(parseMinigamesUrlSearch('?solo=1')).toEqual({ intent: 'solo', joinCode: '' })
    expect(parseMinigamesUrlSearch('?local=1')).toEqual({ intent: 'local', joinCode: '' })
  })

  it('returns null when no mode params', () => {
    expect(parseMinigamesUrlSearch('')).toBeNull()
  })
})

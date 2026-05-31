export type TriviaUrlBootstrap = {
  screen: 'setup'
  mode: 'online'
  onlineIntent: 'join' | 'create'
  gameCodeInput: string
}

export function parseTriviaUrlSearch(search: string): TriviaUrlBootstrap | null {
  const params = new URLSearchParams(search)
  const trivia = params.get('trivia')
  const code = params.get('code')?.trim().toUpperCase()
  if (trivia === 'join' && code) {
    return {
      screen: 'setup',
      mode: 'online',
      onlineIntent: 'join',
      gameCodeInput: code,
    }
  }
  if (trivia === 'create' || params.get('host') === '1') {
    return {
      screen: 'setup',
      mode: 'online',
      onlineIntent: 'create',
      gameCodeInput: '',
    }
  }
  return null
}

export function readTriviaUrlBootstrap(): TriviaUrlBootstrap | null {
  if (typeof window === 'undefined') return null
  try {
    return parseTriviaUrlSearch(window.location.search)
  } catch {
    return null
  }
}

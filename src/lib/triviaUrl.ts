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
  if ((trivia === 'join' || trivia === 'create') && code) {
    return {
      screen: 'setup',
      mode: 'online',
      onlineIntent: trivia,
      gameCodeInput: code,
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

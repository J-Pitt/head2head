import { codeKey, getRedis, minigameCodeKey, todCodeKey } from './redis'

export type ResolvedGame = 'trivia' | 'tod' | 'minigame'

export type ResolvedGameCode = {
  game: ResolvedGame
  roomId: string
}

export function joinPathForGame(game: ResolvedGame, code: string): string {
  const c = encodeURIComponent(code.trim().toUpperCase())
  switch (game) {
    case 'trivia':
      return `/?trivia=join&code=${c}`
    case 'tod':
      return `/truth-or-dare?code=${c}`
    case 'minigame':
      return `/minigames?code=${c}`
  }
}

export function gameLabel(game: ResolvedGame): string {
  switch (game) {
    case 'trivia':
      return 'Trivia'
    case 'tod':
      return 'Truth or Dare'
    case 'minigame':
      return 'Mini games'
  }
}

/** Find which game mode owns a room code (each mode uses a separate Redis key). */
export async function resolveGameByCode(rawCode: string): Promise<ResolvedGameCode | null> {
  const code = String(rawCode).trim().toUpperCase()
  if (!code) return null

  const r = getRedis()
  if (!r) return null

  const [triviaId, todId, minigameId] = await Promise.all([
    r.get(codeKey(code)),
    r.get(todCodeKey(code)),
    r.get(minigameCodeKey(code)),
  ])

  if (triviaId) return { game: 'trivia', roomId: String(triviaId) }
  if (todId) return { game: 'tod', roomId: String(todId) }
  if (minigameId) return { game: 'minigame', roomId: String(minigameId) }
  return null
}

export function wrongGameMessage(found: ResolvedGame, expected: ResolvedGame, code: string) {
  return {
    error: `This code is for ${gameLabel(found)}, not ${gameLabel(expected)}.`,
    game: found,
    joinPath: joinPathForGame(found, code),
  }
}

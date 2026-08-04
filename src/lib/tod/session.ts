/** Persisted online ToD room so leave/refresh can rejoin without retyping the code. */

export const TOD_SESSION_KEY = 'head2head_tod_room'

export type TodSession = {
  roomId: string
  gameCode: string
  entryMode: 'join' | 'create' | 'classic'
  playerName: string
  avatar: string
}

export function loadTodSession(): TodSession | null {
  try {
    const raw = localStorage.getItem(TOD_SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw) as Partial<TodSession>
    if (!data.roomId) return null
    return {
      roomId: String(data.roomId),
      gameCode: data.gameCode ? String(data.gameCode) : '',
      entryMode: data.entryMode === 'create' || data.entryMode === 'classic' ? data.entryMode : 'join',
      playerName: data.playerName ? String(data.playerName) : '',
      avatar: data.avatar ? String(data.avatar) : '',
    }
  } catch {
    return null
  }
}

export function saveTodSession(data: TodSession) {
  try {
    localStorage.setItem(TOD_SESSION_KEY, JSON.stringify(data))
  } catch {
    /* ignore */
  }
}

export function clearTodSession() {
  try {
    localStorage.removeItem(TOD_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

/** Local pass-and-play markers (not rejoined online). */
export function saveLocalTodMarker(entryMode: 'local' | 'classic', roomId: string) {
  try {
    localStorage.setItem(TOD_SESSION_KEY, JSON.stringify({ roomId, entryMode }))
  } catch {
    /* ignore */
  }
}

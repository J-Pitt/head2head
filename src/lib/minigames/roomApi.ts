import type { Player } from '@/lib/types'
import type { Progress, ProgressMap, Session } from './types'

const BASE = '/api/head2head/minigames/room'

async function parseResponse(res: Response, fallback: string) {
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  if (!res.ok) throw new Error((data.error as string) || res.statusText || fallback)
  return data
}

export async function createMinigameRoom(
  gameId: string,
  hostName: string,
  avatar: string,
  playerId: string,
  gameCode?: string
) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, hostName, avatar, playerId, gameCode: gameCode?.trim().toUpperCase() || undefined }),
  })
  const data = await parseResponse(res, 'Failed to create room')
  return data as { roomId: string; gameCode: string; gameId: string; players: Player[] }
}

export async function joinMinigameRoom(
  gameCode: string,
  playerName: string,
  avatar: string,
  playerId: string
) {
  const res = await fetch(`${BASE}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameCode, playerName, avatar, playerId }),
  })
  const data = await parseResponse(res, 'Failed to join')
  return data as {
    roomId: string
    gameId: string
    players: Player[]
    session: Session | null
  }
}

export async function getMinigameRoomClient(roomId: string) {
  const res = await fetch(`${BASE}?roomId=${encodeURIComponent(roomId)}`, { cache: 'no-store' })
  const data = await parseResponse(res, 'Failed to get room')
  return data as {
    roomId: string
    gameCode: string
    gameId: string
    players: Player[]
    session: Session | null
    progress: ProgressMap
    updatedAt: string | null
  }
}

export async function updateSession(roomId: string, session: Session) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, session }),
  })
  return parseResponse(res, 'Failed to update session')
}

export async function reportProgress(roomId: string, round: number, progress: Progress) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, field: `${round}:${progress.playerId}`, progress }),
  })
  return parseResponse(res, 'Failed to report progress')
}

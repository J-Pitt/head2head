import type { Player } from '@/lib/types'
import type { MinigameState } from '@/lib/minigames/types'

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
  playerId: string
) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId, hostName, avatar, playerId }),
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
    state: MinigameState | null
  }
}

export async function getMinigameRoomClient(roomId: string) {
  const res = await fetch(`${BASE}?roomId=${encodeURIComponent(roomId)}`)
  const data = await parseResponse(res, 'Failed to get room')
  return data as {
    roomId: string
    gameCode: string
    gameId: string
    players: Player[]
    state: MinigameState | null
    updatedAt: string | null
  }
}

export async function updateMinigameState(roomId: string, state: MinigameState, winnerName?: string) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, state, winnerName }),
  })
  return parseResponse(res, 'Failed to update')
}

import type { Player } from '@/lib/types'
import type { Progress, ProgressMap } from '@/lib/minigames/types'
import type { TodState } from './types'

const BASE = '/api/head2head/tod/room'

async function parseResponse(res: Response, fallback: string) {
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  if (!res.ok) throw new Error(formatJoinError(data, fallback, res))
  return data
}

function formatJoinError(data: Record<string, unknown>, fallback: string, res: Response) {
  const msg = (data.error as string) || res.statusText || fallback
  const joinPath = data.joinPath as string | undefined
  return joinPath ? `${msg} Try opening ${joinPath}` : msg
}

export async function createTodRoom(
  hostName: string,
  avatar: string,
  playerId: string,
  gameCode?: string
) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName, avatar, playerId, gameCode: gameCode?.trim().toUpperCase() || undefined }),
  })
  const data = await parseResponse(res, 'Failed to create room')
  return data as { roomId: string; gameCode: string; hostId: string; players: Player[] }
}

export async function joinTodRoom(gameCode: string, playerName: string, avatar: string, playerId: string) {
  const res = await fetch(`${BASE}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameCode, playerName, avatar, playerId }),
  })
  const data = await parseResponse(res, 'Failed to join')
  return data as { roomId: string; hostId: string; players: Player[]; state: TodState | null }
}

export type TypingSignal = { id: string; name: string; at: number }

export async function getTodRoomClient(roomId: string) {
  const res = await fetch(`${BASE}?roomId=${encodeURIComponent(roomId)}`, { cache: 'no-store' })
  const data = await parseResponse(res, 'Failed to get room')
  return data as {
    roomId: string
    gameCode: string
    hostId: string
    players: Player[]
    state: TodState | null
    typing: TypingSignal | null
    progress: ProgressMap
    updatedAt: string | null
  }
}

export async function setTodTyping(
  roomId: string,
  playerId: string,
  name: string,
  typing: boolean
) {
  await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, action: 'typing', playerId, name, typing }),
  }).catch(() => {})
}

export async function updateTodState(roomId: string, state: TodState) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, state }),
  })
  return parseResponse(res, 'Failed to update state')
}

export async function leaveTodRoom(roomId: string, playerId: string) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, action: 'leave', playerId }),
  })
  return parseResponse(res, 'Failed to leave') as Promise<{ players: Player[]; hostId: string }>
}

export async function setTodPresence(roomId: string, playerId: string, status: 'active' | 'break') {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, action: 'presence', playerId, status }),
  })
  return parseResponse(res, 'Failed to update presence') as Promise<{ players: Player[]; hostId: string }>
}

export async function kickTodPlayer(roomId: string, requesterId: string, playerId: string) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, action: 'kick', requesterId, playerId }),
  })
  return parseResponse(res, 'Failed to remove player') as Promise<{ players: Player[]; hostId: string }>
}

export async function reportTodProgress(roomId: string, round: number, progress: Progress) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, field: `${round}:${progress.playerId}`, progress }),
  })
  return parseResponse(res, 'Failed to report progress')
}

import type { ChatMessage, GameState, Player } from './types'

const ROOM_PATH = '/api/head2head/room'

async function parseResponse(res: Response, fallbackError: string) {
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  if (!res.ok) {
    const msg = (data.error as string) || (data.message as string) || res.statusText || fallbackError
    throw new Error(msg)
  }
  return data
}

async function fetchRoom(url: string, options?: RequestInit) {
  try {
    return await fetch(url, options)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Network error'
    throw new Error(
      `${msg}. Ensure the dev server is running and UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are set.`
    )
  }
}

export async function createRoom(
  hostName: string,
  avatar: string,
  playerId: string,
  gameCode?: string
): Promise<{ roomId: string; gameCode: string; players: Player[] }> {
  const res = await fetchRoom(ROOM_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      hostName: hostName.trim() || 'Host',
      avatar,
      playerId,
      gameCode: gameCode?.trim().toUpperCase() || undefined,
    }),
  })
  const data = await parseResponse(res, 'Failed to create room')
  return data as { roomId: string; gameCode: string; players: Player[] }
}

export async function joinRoom(
  gameCode: string,
  playerName: string,
  avatar: string,
  playerId: string
): Promise<{
  roomId: string
  players: Player[]
  messages: ChatMessage[]
  state: GameState | null
}> {
  const res = await fetchRoom(`${ROOM_PATH}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gameCode: gameCode.trim().toUpperCase(),
      playerName: playerName.trim() || 'Player',
      avatar,
      playerId,
    }),
  })
  const data = await parseResponse(res, 'Failed to join room')
  return data as {
    roomId: string
    players: Player[]
    messages: ChatMessage[]
    state: GameState | null
  }
}

export async function getRoom(roomId: string): Promise<{
  roomId: string
  gameCode: string
  players: Player[]
  state: GameState | null
  messages: ChatMessage[]
  updatedAt: string | null
}> {
  const res = await fetchRoom(`${ROOM_PATH}?roomId=${encodeURIComponent(roomId)}`, {
    method: 'GET',
  })
  const data = await parseResponse(res, 'Failed to get room')
  return data as {
    roomId: string
    gameCode: string
    players: Player[]
    state: GameState | null
    messages: ChatMessage[]
    updatedAt: string | null
  }
}

export async function updateRoomState(roomId: string, state: GameState) {
  const res = await fetchRoom(ROOM_PATH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, state }),
  })
  return parseResponse(res, 'Failed to update room')
}

export async function getMultiplayerStatus(): Promise<{ available: boolean }> {
  try {
    const res = await fetchRoom(`${ROOM_PATH}/status`)
    const data = await parseResponse(res, 'Status check failed')
    return data as { available: boolean }
  } catch {
    return { available: false }
  }
}

export async function addRoomMessage(roomId: string, playerName: string, text: string) {
  const res = await fetchRoom(`${ROOM_PATH}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, playerName, text }),
  })
  const data = await parseResponse(res, 'Failed to send message')
  return data.messages as ChatMessage[]
}

export async function leaveRoom(roomId: string, playerId: string) {
  const res = await fetchRoom(`${ROOM_PATH}/leave`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, playerId }),
  })
  return parseResponse(res, 'Failed to leave room')
}

export async function setPlayerPresence(
  roomId: string,
  playerId: string,
  status: 'active' | 'break'
): Promise<{ players: Player[]; state: GameState | null }> {
  const res = await fetchRoom(`${ROOM_PATH}/presence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, playerId, status }),
  })
  const data = await parseResponse(res, 'Failed to update presence')
  return {
    players: data.players as Player[],
    state: (data.state as GameState | null) ?? null,
  }
}

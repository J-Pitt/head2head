import { Redis } from '@upstash/redis'

const REDIS_KEY_PREFIX = 'head2head:'
const ROOM_TTL_SEC = 86400
const MAX_MESSAGES = 100

let redis: Redis | null = null

export function getRedis(): Redis | null {
  if (redis) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  redis = new Redis({ url, token })
  return redis
}

export function roomKey(roomId: string) {
  return `${REDIS_KEY_PREFIX}room:${roomId}`
}

export function codeKey(gameCode: string) {
  return `${REDIS_KEY_PREFIX}code:${String(gameCode).toUpperCase()}`
}

export function minigameRoomKey(roomId: string) {
  return `${REDIS_KEY_PREFIX}minigame:room:${roomId}`
}

export function minigameCodeKey(gameCode: string) {
  return `${REDIS_KEY_PREFIX}minigame:code:${String(gameCode).toUpperCase()}`
}

export async function getMinigameRoom(roomId: string) {
  const r = getRedis()
  if (!r) return null
  const raw = await r.get(minigameRoomKey(roomId))
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

export async function setMinigameRoom(roomId: string, room: unknown) {
  const r = getRedis()
  if (!r) return
  await r.set(minigameRoomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC })
}

export function randomGameCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length))
  return code
}

export async function getRoom(roomId: string) {
  const r = getRedis()
  if (!r) return null
  const raw = await r.get(roomKey(roomId))
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

export async function setRoom(roomId: string, room: unknown) {
  const r = getRedis()
  if (!r) return
  await r.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC })
}

export { ROOM_TTL_SEC, MAX_MESSAGES }

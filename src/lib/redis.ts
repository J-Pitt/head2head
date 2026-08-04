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

export function minigameProgressKey(roomId: string) {
  return `${REDIS_KEY_PREFIX}minigame:progress:${roomId}`
}

// Each player writes only their own hash field, so concurrent updates from
// different players never clobber each other (unlike a single shared JSON blob).
export async function setMinigameProgress(roomId: string, field: string, value: unknown) {
  const r = getRedis()
  if (!r) return
  const key = minigameProgressKey(roomId)
  await r.hset(key, { [field]: JSON.stringify(value) })
  await r.expire(key, ROOM_TTL_SEC)
}

export async function getMinigameProgress(roomId: string): Promise<Record<string, unknown>> {
  const r = getRedis()
  if (!r) return {}
  const raw = (await r.hgetall(minigameProgressKey(roomId))) as Record<string, unknown> | null
  if (!raw) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    out[k] = typeof v === 'string' ? safeParse(v) : v
  }
  return out
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
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

// —— Shared room chat (keyed by roomId, works for any room type) ——

const MAX_CHAT = 40

export function chatKey(roomId: string) {
  return `${REDIS_KEY_PREFIX}chat:${roomId}`
}

export async function appendChat(roomId: string, message: unknown) {
  const r = getRedis()
  if (!r) return
  const key = chatKey(roomId)
  await r.rpush(key, JSON.stringify(message))
  await r.ltrim(key, -MAX_CHAT, -1)
  await r.expire(key, ROOM_TTL_SEC)
}

export async function getChat(roomId: string): Promise<unknown[]> {
  const r = getRedis()
  if (!r) return []
  const raw = (await r.lrange(chatKey(roomId), 0, -1)) as unknown[]
  if (!Array.isArray(raw)) return []
  return raw.map((v) => (typeof v === 'string' ? safeParse(v) : v))
}

// —— Shared party playlist (YouTube queue) ——

export function playlistKey(roomId: string) {
  return `${REDIS_KEY_PREFIX}playlist:${roomId}`
}

export async function getPlaylist(roomId: string): Promise<unknown | null> {
  const r = getRedis()
  if (!r) return null
  const raw = await r.get(playlistKey(roomId))
  if (!raw) return null
  return typeof raw === 'string' ? safeParse(raw) : raw
}

export async function setPlaylist(roomId: string, playlist: unknown) {
  const r = getRedis()
  if (!r) return
  await r.set(playlistKey(roomId), JSON.stringify(playlist), { ex: ROOM_TTL_SEC })
}

// —— Truth or Dare rooms ——

export function todRoomKey(roomId: string) {
  return `${REDIS_KEY_PREFIX}tod:room:${roomId}`
}

export function todCodeKey(gameCode: string) {
  return `${REDIS_KEY_PREFIX}tod:code:${String(gameCode).toUpperCase()}`
}

export function todProgressKey(roomId: string) {
  return `${REDIS_KEY_PREFIX}tod:progress:${roomId}`
}

export async function getTodRoom(roomId: string) {
  const r = getRedis()
  if (!r) return null
  const raw = await r.get(todRoomKey(roomId))
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw
}

export async function setTodRoom(roomId: string, room: unknown) {
  const r = getRedis()
  if (!r) return
  await r.set(todRoomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL_SEC })
}

export async function setTodProgress(roomId: string, field: string, value: unknown) {
  const r = getRedis()
  if (!r) return
  const key = todProgressKey(roomId)
  await r.hset(key, { [field]: JSON.stringify(value) })
  await r.expire(key, ROOM_TTL_SEC)
}

export async function getTodProgress(roomId: string): Promise<Record<string, unknown>> {
  const r = getRedis()
  if (!r) return {}
  const raw = (await r.hgetall(todProgressKey(roomId))) as Record<string, unknown> | null
  if (!raw) return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    out[k] = typeof v === 'string' ? safeParse(v) : v
  }
  return out
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

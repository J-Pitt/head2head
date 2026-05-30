import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import {
  getRedis,
  todCodeKey,
  randomGameCode,
  getTodRoom,
  setTodRoom,
  setTodProgress,
  getTodProgress,
  ROOM_TTL_SEC,
} from '@/lib/redis'
import { initialTodState } from '@/lib/tod/types'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId required' }, { status: 400 })
    }
    const room = await getTodRoom(roomId)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }
    const progress = await getTodProgress(roomId)
    return NextResponse.json({
      success: true,
      roomId: room.roomId,
      gameCode: room.gameCode,
      hostId: room.hostId,
      players: room.players || [],
      state: room.state || null,
      progress,
      updatedAt: room.updatedAt || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Per-player minigame progress.
    if (body.roomId && body.progress && body.field) {
      await setTodProgress(String(body.roomId), String(body.field), body.progress)
      return NextResponse.json({ success: true })
    }

    // Shared game-state update.
    if (body.roomId && body.state) {
      const room = await getTodRoom(body.roomId)
      if (!room) {
        return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
      }
      room.state = body.state
      room.updatedAt = new Date().toISOString()
      await setTodRoom(body.roomId, room)
      return NextResponse.json({ success: true, roomId: body.roomId })
    }

    // Create room.
    const hostName = body.hostName && String(body.hostName).trim() ? String(body.hostName).trim() : 'Host'
    const avatar = body.avatar ? String(body.avatar) : 'Maverick'
    const playerId = body.playerId ? String(body.playerId) : randomUUID()

    const r = getRedis()
    if (!r) {
      return NextResponse.json({ success: false, error: 'Redis not configured' }, { status: 500 })
    }

    let code = ''
    let exists = true
    for (let attempt = 0; attempt < 10 && exists; attempt++) {
      code = randomGameCode()
      const v = await r.get(todCodeKey(code))
      exists = v != null
    }
    if (exists) {
      return NextResponse.json({ success: false, error: 'Could not generate unique code' }, { status: 500 })
    }

    const roomId = randomUUID()
    const host = { id: playerId, name: hostName, avatar, status: 'active' as const }
    const room = {
      roomId,
      gameCode: code,
      hostId: playerId,
      players: [host],
      state: initialTodState(),
      updatedAt: new Date().toISOString(),
    }
    await setTodRoom(roomId, room)
    await r.set(todCodeKey(code), roomId, { ex: ROOM_TTL_SEC })
    return NextResponse.json({ success: true, roomId, gameCode: code, hostId: playerId, players: [host] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

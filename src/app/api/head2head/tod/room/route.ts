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

    // Player management: leave, kick (host only), or presence (break/active).
    if (body.roomId && body.action) {
      const room = await getTodRoom(body.roomId)
      if (!room) {
        return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
      }
      let players = Array.isArray(room.players) ? [...room.players] : []
      const pid = String(body.playerId || '')
      const action = String(body.action)

      if (action === 'leave') {
        players = players.filter((p: { id: string }) => p.id !== pid)
      } else if (action === 'kick') {
        if (String(body.requesterId || '') !== room.hostId) {
          return NextResponse.json({ success: false, error: 'Only the host can remove players' }, { status: 403 })
        }
        players = players.filter((p: { id: string }) => p.id !== pid)
      } else if (action === 'presence') {
        const status = body.status === 'break' ? 'break' : 'active'
        const idx = players.findIndex((p: { id: string }) => p.id === pid)
        if (idx >= 0) players[idx] = { ...players[idx], status }
      }

      // If the host left or was removed, hand the host role to whoever remains.
      let hostId = room.hostId
      if (!players.some((p: { id: string }) => p.id === hostId) && players.length) {
        hostId = players[0].id
      }
      room.players = players
      room.hostId = hostId
      room.updatedAt = new Date().toISOString()
      await setTodRoom(body.roomId, room)
      return NextResponse.json({ success: true, players, hostId })
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

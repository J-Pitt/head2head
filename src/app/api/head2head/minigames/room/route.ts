import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import {
  getRedis,
  minigameCodeKey,
  randomGameCode,
  getMinigameRoom,
  setMinigameRoom,
  setMinigameProgress,
  getMinigameProgress,
  ROOM_TTL_SEC,
} from '@/lib/redis'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId required' }, { status: 400 })
    }
    const room = await getMinigameRoom(roomId)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }
    const progress = await getMinigameProgress(roomId)
    return NextResponse.json({
      success: true,
      roomId: room.roomId,
      gameCode: room.gameCode,
      gameId: room.gameId,
      players: room.players || [],
      session: room.session || null,
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

    // —— Per-player progress (high frequency, atomic per field) ——
    if (body.roomId && body.progress && body.field) {
      await setMinigameProgress(String(body.roomId), String(body.field), body.progress)
      return NextResponse.json({ success: true })
    }

    // —— Shared session/lifecycle update (host or turn-taker) ——
    if (body.roomId && body.session) {
      const room = await getMinigameRoom(body.roomId)
      if (!room) {
        return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
      }
      room.session = body.session
      room.updatedAt = new Date().toISOString()
      await setMinigameRoom(body.roomId, room)
      return NextResponse.json({ success: true, roomId: body.roomId })
    }

    // —— Create room ——
    const gameId = body.gameId ? String(body.gameId) : 'frogger'
    const hostName = body.hostName && String(body.hostName).trim() ? String(body.hostName).trim() : 'Host'
    const avatar = body.avatar ? String(body.avatar) : 'star'
    const playerId = body.playerId ? String(body.playerId) : randomUUID()
    const requestedCode = body.gameCode ? String(body.gameCode).trim().toUpperCase() : ''

    const r = getRedis()
    if (!r) {
      return NextResponse.json({ success: false, error: 'Redis not configured' }, { status: 500 })
    }

    let code = ''
    if (requestedCode) {
      if (!/^[A-Z0-9]{4,6}$/.test(requestedCode)) {
        return NextResponse.json(
          { success: false, error: 'Password must be 4–6 letters or numbers' },
          { status: 400 }
        )
      }
      const taken = await r.get(minigameCodeKey(requestedCode))
      if (taken) {
        return NextResponse.json({ success: false, error: 'That password is already taken' }, { status: 409 })
      }
      code = requestedCode
    } else {
      let exists = true
      for (let attempt = 0; attempt < 10 && exists; attempt++) {
        code = randomGameCode()
        const v = await r.get(minigameCodeKey(code))
        exists = v != null
      }
      if (exists) {
        return NextResponse.json({ success: false, error: 'Could not generate unique code' }, { status: 500 })
      }
    }

    const roomId = randomUUID()
    const host = { id: playerId, name: hostName, avatar, status: 'active' as const }
    const room = {
      roomId,
      gameCode: code,
      gameId,
      hostName,
      players: [host],
      session: null,
      updatedAt: new Date().toISOString(),
    }
    await setMinigameRoom(roomId, room)
    await r.set(minigameCodeKey(code), roomId, { ex: ROOM_TTL_SEC })
    return NextResponse.json({ success: true, roomId, gameCode: code, gameId, players: [host] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

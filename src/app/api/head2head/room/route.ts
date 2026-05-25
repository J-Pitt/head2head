import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getRedis, codeKey, randomGameCode, getRoom, setRoom, ROOM_TTL_SEC } from '@/lib/redis'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId required' }, { status: 400 })
    }
    const room = await getRoom(roomId)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }
    return NextResponse.json({
      success: true,
      roomId: room.roomId,
      gameCode: room.gameCode,
      players: room.players || [],
      state: room.state || null,
      messages: room.messages || [],
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

    if (body.roomId !== undefined && body.state !== undefined) {
      const room = await getRoom(body.roomId)
      if (!room) {
        return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
      }
      room.state = body.state
      room.updatedAt = new Date().toISOString()
      await setRoom(body.roomId, room)
      return NextResponse.json({ success: true, roomId: body.roomId })
    }

    const hostName = body.hostName && String(body.hostName).trim() ? String(body.hostName).trim() : 'Host'
    const avatar = body.avatar ? String(body.avatar) : 'star'
    const playerId = body.playerId ? String(body.playerId) : randomUUID()

    const r = getRedis()
    if (!r) {
      return NextResponse.json({ success: false, error: 'Redis not configured' }, { status: 500 })
    }

    let code = ''
    let exists = true
    for (let attempt = 0; attempt < 10 && exists; attempt++) {
      code = randomGameCode()
      const v = await r.get(codeKey(code))
      exists = v != null
    }
    if (exists) {
      return NextResponse.json({ success: false, error: 'Could not generate unique code' }, { status: 500 })
    }

    const roomId = randomUUID()
    const host = { id: playerId, name: hostName, avatar }
    const room = {
      roomId,
      gameCode: code,
      hostName,
      players: [host],
      state: null,
      messages: [],
      updatedAt: new Date().toISOString(),
    }
    await setRoom(roomId, room)
    await r.set(codeKey(code), roomId, { ex: ROOM_TTL_SEC })
    return NextResponse.json({ success: true, roomId, gameCode: code, players: [host] })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getRedis, todCodeKey, getTodRoom, setTodRoom } from '@/lib/redis'
import { resolveGameByCode, wrongGameMessage } from '@/lib/resolveGameCode'

export async function POST(request: Request) {
  try {
    const { gameCode, playerName, avatar, playerId } = await request.json()
    if (!gameCode || !playerName || !String(playerName).trim()) {
      return NextResponse.json({ success: false, error: 'gameCode and playerName required' }, { status: 400 })
    }
    const code = String(gameCode).trim().toUpperCase()
    const r = getRedis()
    if (!r) {
      return NextResponse.json({ success: false, error: 'Redis not configured' }, { status: 500 })
    }
    const roomId = await r.get(todCodeKey(code))
    if (!roomId) {
      const resolved = await resolveGameByCode(code)
      if (resolved && resolved.game !== 'tod') {
        const hint = wrongGameMessage(resolved.game, 'tod', code)
        return NextResponse.json({ success: false, ...hint }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: 'Game code not found' }, { status: 404 })
    }
    const room = await getTodRoom(String(roomId))
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    const players = Array.isArray(room.players) ? [...room.players] : []
    const id = playerId ? String(playerId) : randomUUID()
    const name = String(playerName).trim() || 'Player'
    const av = avatar ? String(avatar) : 'car'

    const existingIdx = players.findIndex((p: { id: string }) => p.id === id)
    if (existingIdx >= 0) {
      players[existingIdx] = { ...players[existingIdx], name, avatar: av, status: 'active' }
    } else {
      const taken = players.some(
        (p: { name: string; id: string }) => p.id !== id && p.name.toLowerCase() === name.toLowerCase()
      )
      if (taken) {
        return NextResponse.json({ success: false, error: 'That name is already taken in this room' }, { status: 409 })
      }
      players.push({ id, name, avatar: av, status: 'active' })
    }

    room.players = players
    room.updatedAt = new Date().toISOString()
    await setTodRoom(room.roomId, room)

    return NextResponse.json({
      success: true,
      roomId: room.roomId,
      hostId: room.hostId,
      players,
      state: room.state || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

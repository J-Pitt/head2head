import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { getRedis, codeKey, getRoom, setRoom } from '@/lib/redis'
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
    const roomId = await r.get(codeKey(code))
    if (!roomId) {
      const resolved = await resolveGameByCode(code)
      if (resolved && resolved.game !== 'trivia') {
        const hint = wrongGameMessage(resolved.game, 'trivia', code)
        return NextResponse.json({ success: false, ...hint }, { status: 409 })
      }
      return NextResponse.json({ success: false, error: 'Game code not found' }, { status: 404 })
    }
    const room = await getRoom(String(roomId))
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }

    const players = Array.isArray(room.players) ? [...room.players] : []
    const id = playerId ? String(playerId) : randomUUID()
    const name = String(playerName).trim() || 'Player'
    const av = avatar ? String(avatar) : 'star'

    const existingIdx = players.findIndex((p: { id: string }) => p.id === id)
    if (existingIdx >= 0) {
      players[existingIdx] = {
        ...players[existingIdx],
        name,
        avatar: av,
        status: 'active',
      }
      room.players = players
      room.updatedAt = new Date().toISOString()
      await setRoom(room.roomId, room)
      return NextResponse.json({
        success: true,
        rejoined: true,
        roomId: room.roomId,
        players,
        messages: room.messages || [],
        state: room.state || null,
      })
    }

    const taken = players.some(
      (p: { name: string; id: string; status?: string }) =>
        p.id !== id && p.name.toLowerCase() === name.toLowerCase() && p.status !== 'break'
    )
    if (taken) {
      return NextResponse.json({ success: false, error: 'That name is already taken in this room' }, { status: 409 })
    }

    players.push({ id, name, avatar: av, status: 'active' })
    room.players = players
    room.updatedAt = new Date().toISOString()
    if (!Array.isArray(room.messages)) room.messages = []
    await setRoom(room.roomId, room)

    return NextResponse.json({
      success: true,
      roomId: room.roomId,
      players,
      messages: room.messages || [],
      state: room.state || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

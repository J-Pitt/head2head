import { NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    const { roomId, playerId } = await request.json()
    if (!roomId || !playerId) {
      return NextResponse.json({ success: false, error: 'roomId and playerId required' }, { status: 400 })
    }
    const room = await getRoom(roomId)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }
    const players = Array.isArray(room.players) ? [...room.players] : []
    const i = players.findIndex((p: { id: string }) => p.id === String(playerId))
    if (i === -1) {
      return NextResponse.json({ success: true, left: false, players, state: room.state })
    }
    players.splice(i, 1)
    room.players = players

    if (room.state?.gameStarted && Array.isArray(room.state.scores)) {
      const state = { ...room.state }
      const scores = { ...state.scores }
      delete scores[String(playerId)]
      let idx = state.currentPlayerIndex ?? 0
      if (players.length === 0) idx = 0
      else {
        if (idx === i) idx = Math.min(i, players.length - 1)
        else if (idx > i) idx = idx - 1
      }
      room.state = { ...state, scores, currentPlayerIndex: idx }
    }

    room.updatedAt = new Date().toISOString()
    await setRoom(roomId, room)
    return NextResponse.json({ success: true, left: true, players: room.players, state: room.state || null })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

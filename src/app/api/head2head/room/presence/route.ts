import { NextResponse } from 'next/server'
import { getRoom, setRoom } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    const { roomId, playerId, status } = await request.json()
    if (!roomId || !playerId) {
      return NextResponse.json({ success: false, error: 'roomId and playerId required' }, { status: 400 })
    }
    const nextStatus = status === 'break' ? 'break' : 'active'
    const room = await getRoom(roomId)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }
    const players = Array.isArray(room.players) ? [...room.players] : []
    const i = players.findIndex((p: { id: string }) => p.id === String(playerId))
    if (i === -1) {
      return NextResponse.json({ success: false, error: 'Player not in room' }, { status: 404 })
    }
    players[i] = { ...players[i], status: nextStatus }
    room.players = players

    if (room.state?.gameStarted) {
      const state = { ...room.state }
      if (nextStatus === 'break') {
        if (state.buzzedBy === playerId) {
          state.buzzedBy = null
          if (state.phase === 'answering') {
            state.phase = 'buzzing'
            state.phaseStartedAt = Date.now()
          }
        }
        const idx = state.currentPlayerIndex ?? 0
        if (players[idx]?.id === playerId && state.phase === 'question') {
          state.currentPlayerIndex = findNextActive(players, idx)
        }
      }
      room.state = state
    }

    room.updatedAt = new Date().toISOString()
    await setRoom(roomId, room)
    return NextResponse.json({
      success: true,
      status: nextStatus,
      players: room.players,
      state: room.state || null,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

function findNextActive(players: { id: string; status?: string }[], from: number) {
  const n = players.length
  for (let step = 1; step <= n; step++) {
    const idx = (from + step) % n
    if (players[idx]?.status !== 'break') return idx
  }
  return from
}

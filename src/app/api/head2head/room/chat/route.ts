import { NextResponse } from 'next/server'
import { getRoom, setRoom, MAX_MESSAGES } from '@/lib/redis'

export async function POST(request: Request) {
  try {
    const { roomId, playerName, text } = await request.json()
    if (!roomId || !String(playerName).trim()) {
      return NextResponse.json({ success: false, error: 'roomId and playerName required' }, { status: 400 })
    }
    const room = await getRoom(roomId)
    if (!room) {
      return NextResponse.json({ success: false, error: 'Room not found' }, { status: 404 })
    }
    if (!Array.isArray(room.messages)) room.messages = []
    const msg = {
      playerName: String(playerName).trim(),
      text: String(text ?? '').trim(),
      ts: Date.now(),
    }
    room.messages.push(msg)
    if (room.messages.length > MAX_MESSAGES) room.messages = room.messages.slice(-MAX_MESSAGES)
    room.updatedAt = new Date().toISOString()
    await setRoom(roomId, room)
    return NextResponse.json({ success: true, messages: room.messages })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

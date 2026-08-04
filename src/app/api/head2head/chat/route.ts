import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { appendChat, getChat } from '@/lib/redis'
import { isVideoDataUrl, MAX_CHAT_IMAGE_CHARS, MAX_MEDIA_DATA_URL_CHARS } from '@/lib/chat'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('roomId')
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId required' }, { status: 400 })
    }
    const messages = await getChat(roomId)
    return NextResponse.json({ success: true, messages })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const roomId = body.roomId ? String(body.roomId) : ''
    if (!roomId) {
      return NextResponse.json({ success: false, error: 'roomId required' }, { status: 400 })
    }
    const text = typeof body.text === 'string' ? body.text.slice(0, 500).trim() : ''
    const image = typeof body.image === 'string' ? body.image : ''
    if (!text && !image) {
      return NextResponse.json({ success: false, error: 'Empty message' }, { status: 400 })
    }
    if (image) {
      const isVideo = isVideoDataUrl(image)
      const maxChars = isVideo ? MAX_MEDIA_DATA_URL_CHARS : MAX_CHAT_IMAGE_CHARS
      if (image.length > maxChars) {
        return NextResponse.json(
          {
            success: false,
            error: isVideo ? 'Video too large — keep it under 50MB' : 'Image too large',
          },
          { status: 413 }
        )
      }
    }
    const message = {
      id: randomUUID(),
      playerId: body.playerId ? String(body.playerId) : '',
      playerName: body.playerName ? String(body.playerName).slice(0, 24) : 'Player',
      avatar: body.avatar ? String(body.avatar) : '',
      text,
      ...(image ? { image } : {}),
      ts: Date.now(),
    }
    await appendChat(roomId, message)
    return NextResponse.json({ success: true, message })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

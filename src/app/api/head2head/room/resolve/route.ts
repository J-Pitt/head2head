import { NextResponse } from 'next/server'
import { getRedis } from '@/lib/redis'
import { gameLabel, joinPathForGame, resolveGameByCode } from '@/lib/resolveGameCode'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.trim().toUpperCase()
    if (!code) {
      return NextResponse.json({ success: false, error: 'code required' }, { status: 400 })
    }

    if (!getRedis()) {
      return NextResponse.json({ success: false, error: 'Redis not configured' }, { status: 500 })
    }

    const resolved = await resolveGameByCode(code)
    if (!resolved) {
      return NextResponse.json({ success: false, found: false, error: 'Game code not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      found: true,
      game: resolved.game,
      gameLabel: gameLabel(resolved.game),
      roomId: resolved.roomId,
      joinPath: joinPathForGame(resolved.game, code),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server error'
    return NextResponse.json({ success: false, error: 'Server error', details: message }, { status: 500 })
  }
}

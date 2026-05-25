import { NextResponse } from 'next/server'

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  return NextResponse.json({ available: !!(url && token) })
}

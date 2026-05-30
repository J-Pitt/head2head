'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchMessages, sendMessage, type ChatMsg } from '@/lib/chat'

const CHAT_POLL_MS = 2000

// Networked room chat. Polled separately (and more slowly) than game state so
// shared images don't bloat the fast game-state polling.
export function useRoomChat(
  roomId: string | null,
  me: { playerId: string; playerName: string; avatar?: string }
) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const meRef = useRef(me)
  meRef.current = me

  useEffect(() => {
    if (!roomId) return
    let cancelled = false
    async function poll() {
      const msgs = await fetchMessages(roomId as string)
      if (!cancelled) setMessages(msgs)
    }
    poll()
    const iv = setInterval(poll, CHAT_POLL_MS)
    return () => {
      cancelled = true
      clearInterval(iv)
    }
  }, [roomId])

  const send = useCallback(
    async (text: string, image?: string) => {
      if (!roomId || (!text.trim() && !image)) return
      const me = meRef.current
      try {
        const msg = await sendMessage(roomId, {
          playerId: me.playerId,
          playerName: me.playerName,
          avatar: me.avatar,
          text: text.trim() || undefined,
          image,
        })
        if (msg) setMessages((prev) => [...prev, msg].slice(-40))
      } catch (e) {
        console.warn('chat send failed', e)
        throw e
      }
    },
    [roomId]
  )

  return { messages, send }
}

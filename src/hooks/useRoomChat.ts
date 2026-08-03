'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchMessages, sendMessage, type ChatMsg } from '@/lib/chat'
import { useLatest } from '@/lib/useLatest'

const CHAT_POLL_MS = 2000

export function useRoomChat(
  roomId: string | null,
  me: { playerId: string; playerName: string; avatar?: string }
) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [localMessages, setLocalMessages] = useState<ChatMsg[]>([])
  const meRef = useLatest(me)

  useEffect(() => {
    if (!roomId || roomId === 'local') return
    let cancelled = false
    async function poll() {
      try {
        const msgs = await fetchMessages(roomId as string)
        if (!cancelled) setMessages(msgs)
      } catch {
        /* retry next poll */
      }
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
      const m = meRef.current
      if (roomId === 'local') {
        const msg: ChatMsg = {
          id: crypto.randomUUID(),
          playerId: m.playerId,
          playerName: m.playerName,
          avatar: m.avatar,
          text: text.trim() || undefined,
          image,
          ts: Date.now(),
        }
        setLocalMessages((prev) => [...prev, msg].slice(-40))
        return
      }
      try {
        const msg = await sendMessage(roomId, {
          playerId: m.playerId,
          playerName: m.playerName,
          avatar: m.avatar,
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

  return {
    messages: roomId === 'local' ? localMessages : messages,
    send,
  }
}

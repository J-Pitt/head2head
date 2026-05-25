'use client'

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '@/lib/types'

type Props = {
  messages: ChatMessage[]
  senderName: string
  onSend: (text: string) => void
  disabled?: boolean
}

export default function ChatBox({ messages, senderName, onSend, disabled }: Props) {
  const [input, setInput] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || disabled) return
    onSend(text)
    setInput('')
  }

  return (
    <div className="chat-panel">
      <div className="chat-header">Room chat</div>
      <div className="chat-messages">
        {messages.length === 0 && <p className="chat-empty">Say hi to the room…</p>}
        {messages.map((m, i) => (
          <div key={`${m.ts}-${i}`} className="chat-msg">
            <span className="chat-name">{m.playerName}</span>
            <span>{m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={disabled ? 'Chat unavailable' : 'Type a message…'}
          className="chat-input"
          maxLength={500}
          disabled={disabled}
        />
        <button type="submit" className="btn btn-sm" disabled={disabled || !input.trim()}>
          Send
        </button>
      </form>
      <p className="chat-hint">Posting as {senderName}</p>
    </div>
  )
}

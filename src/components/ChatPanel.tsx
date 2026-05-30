'use client'

import { useEffect, useRef, useState } from 'react'
import Avatar from '@/components/Avatar'
import { compressImage, type ChatMsg } from '@/lib/chat'

type Props = {
  messages: ChatMsg[]
  meId: string
  onSend: (text: string, image?: string) => void | Promise<void>
  title?: string
}

export default function ChatPanel({ messages, meId, onSend, title = 'Room chat' }: Props) {
  const [input, setInput] = useState('')
  const [pending, setPending] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if ((!text && !pending) || busy) return
    setBusy(true)
    setError('')
    try {
      await onSend(text, pending ?? undefined)
      setInput('')
      setPending(null)
    } catch {
      setError('Could not send')
    } finally {
      setBusy(false)
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    try {
      const data = await compressImage(file)
      if (data.length > 160_000) {
        setError('Image too large — try a smaller one')
        return
      }
      setPending(data)
    } catch {
      setError('Could not load image')
    }
  }

  return (
    <div className="chat-panel chat-embed">
      <div className="chat-header">{title}</div>
      <div className="chat-messages">
        {messages.length === 0 && <p className="chat-empty">Say hi to the room…</p>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-msg ${m.playerId === meId ? 'mine' : ''}`}>
            {m.avatar ? <Avatar seed={m.avatar} size={22} className="chat-avatar" /> : null}
            <div className="chat-bubble">
              <span className="chat-name">{m.playerName}</span>
              {m.text && <span className="chat-text">{m.text}</span>}
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image}
                  alt="shared"
                  className="chat-image"
                  onClick={() => window.open(m.image, '_blank')}
                />
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {pending && (
        <div className="chat-image-preview">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pending} alt="preview" />
          <button type="button" className="chat-image-remove" onClick={() => setPending(null)}>
            ✕
          </button>
        </div>
      )}
      {error && <p className="chat-error">{error}</p>}

      <form className="chat-form" onSubmit={handleSubmit}>
        <button
          type="button"
          className="btn-chat-attach"
          onClick={() => fileRef.current?.click()}
          title="Share a photo"
        >
          📷
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          className="chat-input"
          maxLength={500}
        />
        <button type="submit" className="btn btn-sm" disabled={busy || (!input.trim() && !pending)}>
          Send
        </button>
      </form>
    </div>
  )
}

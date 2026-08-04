'use client'

import { useState, type ReactNode } from 'react'

type Tab = 'chat' | 'music'

type Props = {
  chat: ReactNode
  music: ReactNode
  defaultTab?: Tab
}

export default function RoomSidePanel({ chat, music, defaultTab = 'chat' }: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab)

  return (
    <div className="room-side-panel">
      <div className="room-side-tabs" role="tablist" aria-label="Room sidebar">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'chat'}
          className={`room-side-tab${tab === 'chat' ? ' active' : ''}`}
          onClick={() => setTab('chat')}
        >
          📸 Chat
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'music'}
          className={`room-side-tab${tab === 'music' ? ' active' : ''}`}
          onClick={() => setTab('music')}
        >
          🎵 Playlist
        </button>
      </div>
      <div className="room-side-panel-body" role="tabpanel">
        {tab === 'chat' ? chat : music}
      </div>
    </div>
  )
}

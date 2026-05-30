'use client'

import Link from 'next/link'
import SpinWheel from '@/components/minigames/SpinWheel'
import Avatar from '@/components/Avatar'
import ChatPanel from '@/components/ChatPanel'
import { WHEEL_GAMES, type MinigameId, type MinigameMeta } from '@/lib/minigames/catalog'
import type { Player } from '@/lib/types'
import type { ChatMsg } from '@/lib/chat'

type Props = {
  players: Player[]
  playerId: string
  gameCode: string | null
  beginGame: (gameId: MinigameId) => void
  chatMessages: ChatMsg[]
  onSendChat: (text: string, image?: string) => void | Promise<void>
}

export default function PartyHub({
  players,
  playerId,
  gameCode,
  beginGame,
  chatMessages,
  onSendChat,
}: Props) {
  const play = (g: MinigameMeta) => beginGame(g.id)

  return (
    <div className="app-shell">
      <header className="app-header compact">
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
        <h1>Games room</h1>
      </header>

      <section className="card party-roster">
        <div className="party-roster-head">
          <span>
            Room code: <strong className="room-code-display">{gameCode}</strong>
          </span>
          <span className="party-count">
            {players.length} {players.length === 1 ? 'player' : 'players'}
          </span>
        </div>
        <ul className="party-players">
          {players.map((p) => (
            <li key={p.id}>
              <Avatar seed={p.avatar} size={34} />
              <span>
                {p.name}
                {p.id === playerId ? ' (you)' : ''}
              </span>
            </li>
          ))}
        </ul>
        <p className="party-hint">Anyone can pick the next game — everyone plays together.</p>
      </section>

      <section className="card wheel-card">
        <p className="intro">Spin to pick a game at random, or choose one below.</p>
        <SpinWheel onPlay={play} />
      </section>

      <section className="card">
        <h2 className="section-title">Choose a game</h2>
        <ul className="minigame-list">
          {WHEEL_GAMES.map((g) => (
            <li key={g.id}>
              <button type="button" className="minigame-row playable" onClick={() => play(g)}>
                <span className="minigame-emoji">{g.emoji}</span>
                <div>
                  <strong>{g.label}</strong>
                  <span>{g.blurb}</span>
                </div>
                <span className="minigame-go">Play →</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <ChatPanel messages={chatMessages} meId={playerId} onSend={onSendChat} title="Room chat 📸" />
    </div>
  )
}

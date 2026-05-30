'use client'

import Link from 'next/link'
import AvatarPicker from '@/components/AvatarPicker'

type Props = {
  playerName: string
  setPlayerName: (n: string) => void
  avatar: string
  setAvatar: (a: string) => void
  gameCodeInput: string
  setGameCodeInput: (c: string) => void
  error: string
  hostRoom: () => void
  joinRoom: () => void
}

export default function PartyJoin({
  playerName,
  setPlayerName,
  avatar,
  setAvatar,
  gameCodeInput,
  setGameCodeInput,
  error,
  hostRoom,
  joinRoom,
}: Props) {
  return (
    <div className="app-shell">
      <header className="app-header compact">
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
        <h1>Mini games</h1>
      </header>

      <section className="card setup-card">
        <p className="intro">
          Start a games room or join one with a code. Everyone stays together and you can keep
          playing game after game — no rejoining.
        </p>
        <label className="field">
          <span>Your name</span>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Alex"
            maxLength={24}
          />
        </label>
        <AvatarPicker selected={avatar} onSelect={setAvatar} />

        <div className="online-actions">
          <button type="button" className="btn btn-primary" onClick={hostRoom}>
            Create a games room
          </button>
          <div className="join-row">
            <input
              value={gameCodeInput}
              onChange={(e) => setGameCodeInput(e.target.value.toUpperCase())}
              placeholder="CODE"
              maxLength={6}
              className="code-input"
            />
            <button type="button" className="btn" onClick={joinRoom}>
              Join
            </button>
          </div>
        </div>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  )
}

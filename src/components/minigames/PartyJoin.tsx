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
  entryIntent: 'join' | 'create' | 'solo' | null
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
  entryIntent,
  error,
  hostRoom,
  joinRoom,
}: Props) {
  const fromHome = entryIntent === 'join' || entryIntent === 'create'

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
          {entryIntent === 'join'
            ? 'Enter your name to join the games room.'
            : entryIntent === 'create'
              ? 'Enter your name to start a games room.'
              : 'Start a games room or join one with a code. Everyone stays together and you can keep playing game after game — no rejoining.'}
        </p>
        {entryIntent === 'join' && gameCodeInput && (
          <p className="setup-code-hint">
            Room code: <strong className="room-code-display">{gameCodeInput}</strong>
          </p>
        )}
        <label className="field">
          <span>Your name</span>
          <input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Alex"
            maxLength={24}
            autoFocus
          />
        </label>
        <AvatarPicker selected={avatar} onSelect={setAvatar} />

        <div className="online-actions">
          {entryIntent === 'create' ? (
            <button type="button" className="btn btn-primary full" onClick={hostRoom}>
              Enter lobby
            </button>
          ) : entryIntent === 'join' ? (
            <button type="button" className="btn btn-primary full" onClick={() => joinRoom()}>
              Join room
            </button>
          ) : (
            <>
              <button type="button" className="btn btn-primary" onClick={hostRoom}>
                Start a games room
              </button>
              <div className="join-row">
                <input
                  value={gameCodeInput}
                  onChange={(e) => setGameCodeInput(e.target.value.toUpperCase())}
                  placeholder="CODE"
                  maxLength={6}
                  className="code-input"
                />
                <button type="button" className="btn" onClick={() => joinRoom()}>
                  Join
                </button>
              </div>
            </>
          )}
        </div>
        {error && <p className="error">{error}</p>}
      </section>
    </div>
  )
}

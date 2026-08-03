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
  entryIntent: 'join' | 'create' | 'solo' | 'local' | null
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
  const intro =
    entryIntent === 'solo'
      ? 'Enter your name and pick an avatar. Play on your own and try every mini game.'
      : entryIntent === 'local'
        ? 'Enter your name and pick an avatar. Everyone plays on this device — pass it around between games.'
        : entryIntent === 'join'
          ? 'Enter your name to join the games room.'
          : entryIntent === 'create'
            ? 'Enter your name to start a games room.'
            : 'Play solo, pass-and-play locally, or start/join an online room. Everyone stays together and you can keep playing game after game.'

  const kicker =
    entryIntent === 'solo'
      ? 'Solo'
      : entryIntent === 'local'
        ? 'Pass & play'
        : entryIntent === 'join'
          ? 'Join online'
          : entryIntent === 'create'
            ? 'Host online'
            : null

  const cta =
    entryIntent === 'solo' || entryIntent === 'local'
      ? 'Enter lobby'
      : entryIntent === 'join'
        ? 'Join room'
        : entryIntent === 'create'
          ? 'Enter lobby'
          : 'Start a games room'

  return (
    <div className="app-shell">
      <header className="app-header compact">
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
        <h1>Mini games</h1>
      </header>

      <section className="card setup-card">
        {kicker && <p className="tod-kicker">{kicker}</p>}
        <p className="intro">{intro}</p>
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
          {entryIntent === 'create' || entryIntent === 'solo' || entryIntent === 'local' ? (
            <button type="button" className="btn btn-primary full" onClick={hostRoom}>
              {cta}
            </button>
          ) : entryIntent === 'join' ? (
            <button type="button" className="btn btn-primary full" onClick={() => joinRoom()}>
              {cta}
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

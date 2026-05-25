'use client'

import { avatarEmoji } from '@/lib/avatars'
import type { Player } from '@/lib/types'

type Props = {
  players: Player[]
  currentIndex: number
  myPlayerId?: string
  buzzedPlayerId?: string
}

export default function PlayerCircle({ players, currentIndex, myPlayerId, buzzedPlayerId }: Props) {
  const n = players.length
  const nextIndex = n > 0 ? (currentIndex + 1) % n : 0
  const radius = n <= 2 ? 38 : n <= 4 ? 42 : 46

  return (
    <div className="player-circle-wrap">
      <ul className="player-circle" aria-label="Players in the room">
        {players.map((p, i) => {
          const angle = (360 / n) * i - 90
          const isCurrent = buzzedPlayerId ? p.id === buzzedPlayerId : i === currentIndex
          const isNext = !buzzedPlayerId && i === nextIndex && n > 1
          const isMe = p.id === myPlayerId
          const isBuzzed = p.id === buzzedPlayerId
          return (
            <li
              key={p.id}
              className={`player-seat ${isCurrent ? 'current' : ''} ${isNext ? 'next' : ''} ${isMe ? 'me' : ''} ${isBuzzed ? 'buzzed' : ''}`}
              style={{
                transform: `rotate(${angle}deg) translate(${radius}vmin) rotate(${-angle}deg)`,
              }}
            >
              <div className="player-avatar" title={p.name}>
                <span className="player-emoji">{avatarEmoji(p.avatar)}</span>
                {isCurrent && <span className="turn-badge">Turn</span>}
                {isNext && !isCurrent && <span className="next-badge">Next</span>}
              </div>
              <span className="player-name">{p.name}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

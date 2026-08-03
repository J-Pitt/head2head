'use client'

import BoardPiece from '@/components/tod/BoardPiece'

type Props = {
  name: string
  pieceId: string
  penalty?: string | null
}

/** Dramatic lockup card — crying piece behind jail bars for everyone. */
export default function JailLockup({ name, pieceId, penalty }: Props) {
  return (
    <div className="jail-lockup" role="status" aria-live="polite">
      <p className="jail-lockup-banner">LOCKED UP</p>
      <div className="jail-cell">
        <div className="jail-cell-glow" aria-hidden />
        <div className="jail-inmate">
          <BoardPiece pieceId={pieceId} size={96} className="jail-piece" />
          <span className="jail-cry" aria-hidden>
            😭
          </span>
        </div>
        <div className="jail-bars" aria-hidden>
          {Array.from({ length: 7 }, (_, i) => (
            <span key={i} className="jail-bar" style={{ ['--i' as string]: i }} />
          ))}
        </div>
        <div className="jail-floor" aria-hidden />
      </div>
      <h2 className="jail-lockup-name">{name} is behind bars</h2>
      <p className="jail-lockup-sub">Misses their next turn · must complete a penalty to continue</p>
      {penalty && <p className="jail-lockup-penalty">{penalty.replace(/^🚔 Jail penalty:\s*/i, '')}</p>}
    </div>
  )
}

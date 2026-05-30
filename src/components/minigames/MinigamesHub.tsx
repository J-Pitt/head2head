'use client'

import Link from 'next/link'
import SpinWheel from '@/components/minigames/SpinWheel'
import { WHEEL_GAMES } from '@/lib/minigames/catalog'

export default function MinigamesHub() {
  return (
    <div className="app-shell">
      <header className="app-header compact">
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
        <h1>Mini games</h1>
      </header>

      <section className="card wheel-card">
        <p className="intro">Spin the wheel — all 12 games are live with online rooms.</p>
        <SpinWheel />
      </section>

      <section className="card">
        <h2 className="section-title">All games</h2>
        <ul className="minigame-list">
          {WHEEL_GAMES.map((g) => (
            <li key={g.id}>
              <Link href={`/minigames/${g.id}`} className="minigame-row playable">
                <span className="minigame-emoji">{g.emoji}</span>
                <div>
                  <strong>{g.label}</strong>
                  <span>{g.blurb}</span>
                </div>
                <span className="minigame-go">Play →</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

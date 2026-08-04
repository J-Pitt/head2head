'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { resolveGameCode } from '@/lib/roomApi'

function HomeQuickModeTile({
  className,
  icon,
  title,
  subtitle,
  selected,
  onSelect,
  pickPanel,
}: {
  className: string
  icon: string
  title: string
  subtitle: string
  selected: boolean
  onSelect: () => void
  pickPanel?: ReactNode
}) {
  return (
    <div className={`mode-card mode-card-hot ${className} ${selected ? 'selected' : ''}`}>
      <button type="button" className="mode-card-inner" onClick={onSelect}>
        <span className="mode-icon">{icon}</span>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </button>
      {selected && pickPanel && (
        <div className="mode-card-overlay" onClick={(e) => e.stopPropagation()}>
          {pickPanel}
        </div>
      )}
    </div>
  )
}

export default function BoardGameHome() {
  const router = useRouter()
  const [onlineOpen, setOnlineOpen] = useState(false)
  const [onlineAction, setOnlineAction] = useState<'join' | null>(null)
  const [joinGameCode, setJoinGameCode] = useState('')
  const [joinRouteError, setJoinRouteError] = useState('')

  const [minigamesOpen, setMinigamesOpen] = useState(false)
  const [minigamesOnlineOpen, setMinigamesOnlineOpen] = useState(false)
  const [minigamesJoinAction, setMinigamesJoinAction] = useState(false)
  const [minigamesJoinCode, setMinigamesJoinCode] = useState('')

  function closeMinigamesPanel() {
    setMinigamesOpen(false)
    setMinigamesOnlineOpen(false)
    setMinigamesJoinAction(false)
    setMinigamesJoinCode('')
  }

  return (
    <div className="app-shell tod-home">
      <div className="tod-home-bg" aria-hidden="true">
        <span className="tod-glow tod-glow-rose" />
        <span className="tod-glow tod-glow-violet" />
      </div>

      <div className="tod-home-content">
        <header className="app-header tod-home-header">
          <span className="tod-badge">Party game · 18+</span>
          <h1 className="tod-logo tod-logo-stacked">
            <span className="tod-logo-main">Truth or Dare</span>
            <span className="tod-logo-sub">Board game edition</span>
          </h1>
          <p className="tod-tagline">Roll the dice. Land on a tile. Truth, dare, or mini-game forfeit.</p>
        </header>

        <section className="card tod-home-actions tod-glass">
          {!onlineOpen ? (
            <div className="home-play-pick">
              <Link href="/truth-or-dare?local=1" className="btn full home-cta home-cta-local">
                PLAY LOCALLY
              </Link>
              <button
                type="button"
                className="btn full home-cta home-cta-online"
                onClick={() => setOnlineOpen(true)}
              >
                PLAY ONLINE
              </button>
            </div>
          ) : !onlineAction ? (
            <div className="home-online-pick">
              <p className="home-online-label">Play online</p>
              <button
                type="button"
                className="btn full home-cta home-cta-join"
                onClick={() => setOnlineAction('join')}
              >
                Join game
              </button>
              <button
                type="button"
                className="btn full home-cta home-cta-create"
                onClick={() => router.push('/truth-or-dare?host=1')}
              >
                Start game
              </button>
              <button
                type="button"
                className="btn-ghost home-back"
                onClick={() => setOnlineOpen(false)}
              >
                ← Back
              </button>
            </div>
          ) : (
            <form
              className="home-online-form"
              onSubmit={async (e) => {
                e.preventDefault()
                const code = joinGameCode.trim().toUpperCase()
                if (!code) return
                setJoinRouteError('')
                const resolved = await resolveGameCode(code)
                if (!resolved) {
                  setJoinRouteError(
                    'Game code not found. Double-check the code or ask the host to share it again.'
                  )
                  return
                }
                if (resolved.game !== 'tod') {
                  setJoinRouteError('That code is for a different game mode. Use Mini games below to join.')
                  return
                }
                router.push(resolved.joinPath)
              }}
            >
              <p className="home-online-label">Enter the game code</p>
              <input
                value={joinGameCode}
                onChange={(e) => setJoinGameCode(e.target.value.toUpperCase())}
                placeholder="GAME CODE"
                maxLength={6}
                className="code-input home-pwd-input"
                autoFocus
              />
              <button
                type="submit"
                className="btn full home-cta home-cta-join"
                disabled={!joinGameCode.trim()}
              >
                Continue to join
              </button>
              {joinRouteError && <p className="error">{joinRouteError}</p>}
              <button
                type="button"
                className="btn-ghost home-back"
                onClick={() => {
                  setOnlineAction(null)
                  setJoinGameCode('')
                  setJoinRouteError('')
                }}
              >
                ← Back
              </button>
            </form>
          )}
        </section>

        <p className="home-divider">Also try</p>

        <section className="card hero-card tod-glass home-quick-card">
          <div className="mode-grid">
            <HomeQuickModeTile
              className="mode-minigames"
              icon="🎮"
              title="Mini games"
              subtitle="Frogger, Snake & more"
              selected={minigamesOpen}
              onSelect={() => {
                setMinigamesOpen((prev) => !prev)
                setMinigamesOnlineOpen(false)
                setMinigamesJoinAction(false)
                setMinigamesJoinCode('')
              }}
              pickPanel={
                minigamesOpen ? (
                  minigamesJoinAction ? (
                    <div className="mode-card-overlay-inner">
                      <div className="home-quick-panel-head">
                        <p className="home-online-label">Mini games — join</p>
                        <button
                          type="button"
                          className="btn-ghost home-back home-back-inline"
                          onClick={() => {
                            setMinigamesJoinAction(false)
                            setMinigamesJoinCode('')
                          }}
                        >
                          ← Back
                        </button>
                      </div>
                      <form
                        className="home-online-form home-online-form-compact"
                        onSubmit={(e) => {
                          e.preventDefault()
                          const code = minigamesJoinCode.trim().toUpperCase()
                          if (!code) return
                          closeMinigamesPanel()
                          router.push(`/minigames?code=${encodeURIComponent(code)}`)
                        }}
                      >
                        <input
                          value={minigamesJoinCode}
                          onChange={(e) => setMinigamesJoinCode(e.target.value.toUpperCase())}
                          placeholder="GAME CODE"
                          maxLength={6}
                          className="code-input home-pwd-input"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="btn full home-cta home-cta-join"
                          disabled={!minigamesJoinCode.trim()}
                        >
                          Continue to join
                        </button>
                      </form>
                    </div>
                  ) : minigamesOnlineOpen ? (
                    <div className="mode-card-overlay-inner">
                      <p className="home-online-label">Mini games — online</p>
                      <button
                        type="button"
                        className="btn full home-cta home-cta-join"
                        onClick={() => setMinigamesJoinAction(true)}
                      >
                        Join game
                      </button>
                      <button
                        type="button"
                        className="btn full home-cta home-cta-create"
                        onClick={() => {
                          closeMinigamesPanel()
                          router.push('/minigames?host=1')
                        }}
                      >
                        Start game
                      </button>
                      <button
                        type="button"
                        className="btn-ghost home-back"
                        onClick={() => setMinigamesOnlineOpen(false)}
                      >
                        ← Back
                      </button>
                    </div>
                  ) : (
                    <div className="mode-card-overlay-inner">
                      <button
                        type="button"
                        className="btn full home-cta home-cta-solo"
                        onClick={() => {
                          closeMinigamesPanel()
                          router.push('/minigames?solo=1')
                        }}
                      >
                        Play solo
                      </button>
                      <button
                        type="button"
                        className="btn full home-cta home-cta-local"
                        onClick={() => {
                          closeMinigamesPanel()
                          router.push('/minigames?local=1')
                        }}
                      >
                        Play locally
                      </button>
                      <button
                        type="button"
                        className="btn full home-cta home-cta-online"
                        onClick={() => setMinigamesOnlineOpen(true)}
                      >
                        Play online
                      </button>
                      <button type="button" className="btn-ghost home-back" onClick={closeMinigamesPanel}>
                        ← Back
                      </button>
                    </div>
                  )
                ) : undefined
              }
            />
          </div>
        </section>
      </div>
    </div>
  )
}

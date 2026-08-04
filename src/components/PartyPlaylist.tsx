'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { youtubeEmbedUrl, type PlaylistTrack } from '@/lib/playlist'

type Props = {
  current: PlaylistTrack | null
  queue: PlaylistTrack[]
  meId: string
  error?: string
  onAdd: (url: string) => Promise<void>
  onPlay: (trackId: string) => Promise<void>
  onNext: () => Promise<void>
  onRemove: (trackId: string) => Promise<void>
  onClear: () => Promise<void>
}

export default function PartyPlaylist({
  current,
  queue,
  meId,
  error,
  onAdd,
  onPlay,
  onNext,
  onRemove,
  onClear,
}: Props) {
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const advancingRef = useRef(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Tell the embed we want state-change events, then auto-advance on ended.
  useEffect(() => {
    if (!current) return
    const iframe = iframeRef.current
    const sendListening = () => {
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: current.videoId }),
        '*'
      )
    }
    sendListening()
    const iv = setInterval(sendListening, 2000)

    function onMessage(event: MessageEvent) {
      if (typeof event.origin !== 'string' || !event.origin.includes('youtube')) return
      let data: unknown = event.data
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          return
        }
      }
      if (!data || typeof data !== 'object') return
      const info = data as { event?: string; info?: number }
      // YT.PlayerState.ENDED === 0
      if (info.event === 'onStateChange' && info.info === 0) {
        if (advancingRef.current) return
        advancingRef.current = true
        onNext().finally(() => {
          advancingRef.current = false
        })
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      clearInterval(iv)
      window.removeEventListener('message', onMessage)
    }
  }, [current, onNext])

  async function handleAdd(e: FormEvent) {
    e.preventDefault()
    if (!url.trim() || busy) return
    setBusy(true)
    setLocalError('')
    try {
      await onAdd(url.trim())
      setUrl('')
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Could not add')
    } finally {
      setBusy(false)
    }
  }

  const displayError = localError || error

  return (
    <div className="party-playlist">
      <div className="party-playlist-player">
        {current ? (
          <iframe
            key={current.id}
            ref={iframeRef}
            className="party-playlist-iframe"
            src={youtubeEmbedUrl(current.videoId, { autoplay: true })}
            title={current.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <div className="party-playlist-empty">
            <p>🎵 Party playlist</p>
            <span>Paste a YouTube link to start the queue</span>
          </div>
        )}
      </div>

      {current && (
        <div className="party-playlist-now">
          <div className="party-playlist-now-text">
            <strong>Now playing</strong>
            <span title={current.title}>{current.title}</span>
            <em>added by {current.addedByName}</em>
          </div>
          <button type="button" className="btn-ghost btn-sm" onClick={() => onNext()} disabled={busy}>
            Next →
          </button>
        </div>
      )}

      <form className="party-playlist-add" onSubmit={handleAdd}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste YouTube link…"
          className="party-playlist-input"
          disabled={busy}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !url.trim()}>
          Add
        </button>
      </form>

      {displayError && <p className="party-playlist-error">{displayError}</p>}

      <div className="party-playlist-queue-head">
        <span>Queue ({queue.length})</span>
        {queue.length > 0 && (
          <button type="button" className="btn-ghost btn-sm" onClick={() => onClear()} disabled={busy}>
            Clear
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <p className="party-playlist-hint">Anyone in the room can add songs.</p>
      ) : (
        <ul className="party-playlist-queue">
          {queue.map((track, i) => {
            const isCurrent = track.id === current?.id
            return (
              <li key={track.id} className={`party-playlist-track${isCurrent ? ' is-current' : ''}`}>
                <button
                  type="button"
                  className="party-playlist-track-main"
                  onClick={() => onPlay(track.id)}
                  title="Play this track"
                >
                  <span className="party-playlist-track-num">{isCurrent ? '▶' : i + 1}</span>
                  <span className="party-playlist-track-meta">
                    <span className="party-playlist-track-title">{track.title}</span>
                    <span className="party-playlist-track-by">{track.addedByName}</span>
                  </span>
                </button>
                {(track.addedBy === meId || !isCurrent) && (
                  <button
                    type="button"
                    className="btn-ghost btn-sm party-playlist-remove"
                    aria-label="Remove from queue"
                    onClick={() => onRemove(track.id)}
                  >
                    ✕
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

'use client'

import { useState, type FormEvent } from 'react'
import { isVideoDataUrl, readAnswerMedia } from '@/lib/chat'

type Props = {
  category: 'truth' | 'dare'
  onSubmit: (text: string, media?: string) => void | Promise<void>
  disabled?: boolean
  /** Override labels for special / challenge tiles. */
  labels?: { text: string; placeholder: string; upload: string }
}

export default function BoardAnswerForm({ category, onSubmit, disabled, labels }: Props) {
  const [text, setText] = useState('')
  const [media, setMedia] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const textLabel = labels?.text ?? (category === 'truth' ? 'Your answer' : 'What you did')
  const placeholder =
    labels?.placeholder ?? (category === 'truth' ? 'Type your honest answer…' : 'Describe what you did…')
  const uploadLabel = labels?.upload ?? '📸 Add a photo or video'

  async function handleFile(file: File | null) {
    if (!file) return
    setError('')
    try {
      const dataUrl = await readAnswerMedia(file)
      setMedia(dataUrl)
      setPreview(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load that file')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() && !media) {
      setError('Write your answer or attach a photo / video')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit(text.trim(), media ?? undefined)
    } catch {
      setError('Could not submit — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="board-answer-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>{textLabel}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="tod-textarea board-answer-text"
          placeholder={placeholder}
          rows={4}
          maxLength={600}
          disabled={disabled || busy}
          autoFocus
        />
      </label>

      <div className="board-answer-upload">
        <label className="btn btn-sm board-upload-btn">
          {uploadLabel}
          <input
            type="file"
            accept="image/*,video/*"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {preview && (
          <div className="board-answer-preview">
            {isVideoDataUrl(preview) ? (
              <video src={preview} controls playsInline muted />
            ) : (
              <img src={preview} alt="Answer media" />
            )}
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => {
                setMedia(null)
                setPreview(null)
              }}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <button type="submit" className="btn btn-primary full" disabled={disabled || busy}>
        Done — show everyone
      </button>
    </form>
  )
}

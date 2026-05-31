'use client'

import { useState, type FormEvent } from 'react'
import { compressImage } from '@/lib/chat'

type Props = {
  category: 'truth' | 'dare'
  prompt: string
  onSubmit: (text: string, image?: string) => void | Promise<void>
  disabled?: boolean
}

export default function ClassicAnswerForm({ category, prompt, onSubmit, disabled }: Props) {
  const [text, setText] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File | null) {
    if (!file) return
    setError('')
    try {
      const dataUrl = await compressImage(file)
      setImage(dataUrl)
      setPreview(dataUrl)
    } catch {
      setError('Could not load that image')
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim() && !image) {
      setError(category === 'truth' ? 'Write your answer' : 'Write what you did or attach a photo')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit(text.trim(), image ?? undefined)
      setText('')
      setImage(null)
      setPreview(null)
    } catch {
      setError('Could not submit — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="classic-answer">
      <div className={`classic-prompt-card classic-prompt-${category}`}>
        <span className="classic-prompt-badge">{category === 'truth' ? 'Truth' : 'Dare'}</span>
        <p className="classic-prompt-text">{prompt}</p>
      </div>

      <form className="classic-answer-form" onSubmit={handleSubmit}>
        <label className="setup-label">
          {category === 'truth' ? 'Your answer' : 'What you did'}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="setup-input classic-answer-text"
            placeholder={category === 'truth' ? 'Type your honest answer…' : 'Describe what you did…'}
            rows={4}
            maxLength={600}
            disabled={disabled || busy}
            autoFocus
          />
        </label>

        {category === 'dare' && (
          <div className="classic-dare-upload">
            <label className="btn btn-play-secondary classic-upload-btn">
              📸 Attach photo proof
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={disabled || busy}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {preview && (
              <div className="classic-image-preview">
                <img src={preview} alt="Upload preview" />
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => {
                    setImage(null)
                    setPreview(null)
                  }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {error && <p className="room-error">{error}</p>}

        <button type="submit" className="btn btn-play full" disabled={disabled || busy}>
          Submit &amp; next turn →
        </button>
      </form>
    </div>
  )
}

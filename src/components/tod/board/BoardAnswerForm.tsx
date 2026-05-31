'use client'

import { useState, type FormEvent } from 'react'
import { compressImage } from '@/lib/chat'

type Props = {
  category: 'truth' | 'dare'
  onSubmit: (text: string, image?: string) => void | Promise<void>
  disabled?: boolean
}

export default function BoardAnswerForm({ category, onSubmit, disabled }: Props) {
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
      setError('Write your answer or attach a photo')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onSubmit(text.trim(), image ?? undefined)
    } catch {
      setError('Could not submit — try again')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="board-answer-form" onSubmit={handleSubmit}>
      <label className="field">
        <span>{category === 'truth' ? 'Your answer' : 'What you did'}</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="tod-textarea board-answer-text"
          placeholder={category === 'truth' ? 'Type your honest answer…' : 'Describe what you did…'}
          rows={4}
          maxLength={600}
          disabled={disabled || busy}
          autoFocus
        />
      </label>

      <div className="board-answer-upload">
        <label className="btn btn-sm board-upload-btn">
          📸 Add a photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            disabled={disabled || busy}
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {preview && (
          <div className="board-answer-preview">
            <img src={preview} alt="Answer photo" />
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

      {error && <p className="error">{error}</p>}

      <button type="submit" className="btn btn-primary full" disabled={disabled || busy}>
        Done — show everyone
      </button>
    </form>
  )
}

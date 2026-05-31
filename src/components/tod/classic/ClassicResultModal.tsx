'use client'

import { useEffect } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  category: 'truth' | 'dare' | null
  forPlayer: string | null
  text: string | null
  canDismiss?: boolean
}

export default function ClassicResultModal({
  isOpen,
  onClose,
  category,
  forPlayer,
  text,
  canDismiss = true,
}: Props) {
  useEffect(() => {
    if (!isOpen || !canDismiss) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose, canDismiss])

  if (!isOpen || !text || !category) return null

  const label = category === 'truth' ? 'Truth' : 'Dare'

  return (
    <div className="result-modal-backdrop">
      <div className={`result-modal ${category}`}>
        <div className="result-modal-icon">{category === 'truth' ? '💜' : '🔥'}</div>
        <span className="result-modal-label">
          {label} for {forPlayer}
        </span>
        <p className="result-modal-text">{text}</p>
        {canDismiss && (
          <div className="result-modal-actions">
            <button type="button" className="btn btn-play result-modal-done" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

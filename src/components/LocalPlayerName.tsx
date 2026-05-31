'use client'

import { useEffect, useState, type FormEvent } from 'react'

export default function LocalPlayerName({
  name,
  editable,
  onRename,
}: {
  name: string
  editable: boolean
  onRename: (name: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(name)

  useEffect(() => {
    if (!editing) setDraft(name)
  }, [name, editing])

  if (!editable) {
    return <span className="local-player-name">{name}</span>
  }

  if (editing) {
    return (
      <form
        className="local-player-name-form"
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          const next = draft.trim()
          if (next) onRename(next)
          setEditing(false)
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={24}
          className="local-player-name-input"
          autoFocus
        />
        <button type="submit" className="btn-ghost btn-sm" disabled={!draft.trim()}>
          Save
        </button>
        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => {
            setDraft(name)
            setEditing(false)
          }}
        >
          Cancel
        </button>
      </form>
    )
  }

  return (
    <span className="local-player-name local-player-name-editable">
      {name}
      <button
        type="button"
        className="btn-ghost btn-sm local-player-name-edit"
        onClick={() => setEditing(true)}
        title={`Rename ${name}`}
      >
        Edit
      </button>
    </span>
  )
}

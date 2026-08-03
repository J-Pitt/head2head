export type BoardTodEntryMode = 'local' | 'join' | 'create'

export type BoardTodUrlBootstrap = {
  entryMode: BoardTodEntryMode | null
  joinCode: string
}

/** Board-game Truth or Dare URLs (`/truth-or-dare` without `classic=1`). */
export function parseBoardTodUrlSearch(search: string): BoardTodUrlBootstrap {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  if (params.get('classic') === '1') return { entryMode: null, joinCode: '' }
  if (params.get('local') === '1') return { entryMode: 'local', joinCode: '' }
  const code = params.get('code')?.trim().toUpperCase()
  if (code) return { entryMode: 'join', joinCode: code }
  if (params.get('host') === '1' || params.get('create') === '1') {
    return { entryMode: 'create', joinCode: '' }
  }
  return { entryMode: null, joinCode: '' }
}

export function readBoardTodUrlBootstrap(): BoardTodUrlBootstrap {
  if (typeof window === 'undefined') return { entryMode: null, joinCode: '' }
  try {
    return parseBoardTodUrlSearch(window.location.search)
  } catch {
    return { entryMode: null, joinCode: '' }
  }
}

export type MinigamesPlayMode = 'join' | 'create' | 'solo' | 'local'

export type MinigamesUrlBootstrap = {
  intent: MinigamesPlayMode
  joinCode: string
}

export function parseMinigamesUrlSearch(search: string): MinigamesUrlBootstrap | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const code = params.get('code')?.trim().toUpperCase()
  if (code) return { intent: 'join', joinCode: code }
  if (params.get('host') === '1' || params.get('create') === '1') {
    return { intent: 'create', joinCode: '' }
  }
  if (params.get('solo') === '1') return { intent: 'solo', joinCode: '' }
  if (params.get('local') === '1') return { intent: 'local', joinCode: '' }
  return null
}

export function readMinigamesUrlBootstrap(): MinigamesUrlBootstrap | null {
  if (typeof window === 'undefined') return null
  try {
    return parseMinigamesUrlSearch(window.location.search)
  } catch {
    return null
  }
}

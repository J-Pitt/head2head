export type ClassicUrlBootstrap = {
  intent: 'join' | 'create' | 'solo'
  joinCode: string
}

export function parseClassicUrlSearch(search: string): ClassicUrlBootstrap | null {
  const params = new URLSearchParams(search)
  if (params.get('classic') !== '1') return null
  const code = params.get('code')?.trim().toUpperCase()
  const create = params.get('create')?.trim().toUpperCase()
  if (code) return { intent: 'join', joinCode: code }
  if (create) return { intent: 'create', joinCode: create }
  return { intent: 'solo', joinCode: '' }
}

export function readClassicUrlBootstrap(): ClassicUrlBootstrap | null {
  if (typeof window === 'undefined') return null
  try {
    return parseClassicUrlSearch(window.location.search)
  } catch {
    return null
  }
}

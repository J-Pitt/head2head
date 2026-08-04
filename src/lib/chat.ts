export type ChatMsg = {
  id: string
  playerId: string
  playerName: string
  avatar?: string
  text?: string
  image?: string
  ts: number
}

/** Max raw video file size for board answers and chat uploads. */
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024 // 50MB

/** Base64 data-URL ceiling (~4/3 expansion + header) for a 50MB video. */
export const MAX_MEDIA_DATA_URL_CHARS = Math.ceil(MAX_VIDEO_BYTES * (4 / 3)) + 256

/** Compressed chat stills stay small; videos may use the full media ceiling. */
export const MAX_CHAT_IMAGE_CHARS = 160_000

const BASE = '/api/head2head/chat'

export async function fetchMessages(roomId: string): Promise<ChatMsg[]> {
  const res = await fetch(`${BASE}?roomId=${encodeURIComponent(roomId)}`, { cache: 'no-store' })
  if (!res.ok) return []
  const data = await res.json().catch(() => ({}))
  return Array.isArray(data.messages) ? (data.messages as ChatMsg[]) : []
}

export async function sendMessage(
  roomId: string,
  payload: { playerId: string; playerName: string; avatar?: string; text?: string; image?: string }
): Promise<ChatMsg | null> {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, ...payload }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to send')
  }
  const data = await res.json()
  return (data.message as ChatMsg) ?? null
}

// Compress an image file to a small JPEG data URL suitable for Redis storage.
export function compressImage(file: File, maxSize = 420, quality = 0.5): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Invalid image'))
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas unavailable'))
        let { width, height } = img
        if (width > height && width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        } else if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

/** Image (compressed) or video (up to 50MB) as a data URL. */
export async function readAnswerMedia(file: File): Promise<string> {
  if (file.type.startsWith('video/')) {
    if (file.size > MAX_VIDEO_BYTES) {
      throw new Error('Video is too large — keep it under 50MB')
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Could not read video'))
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
  }
  if (file.type.startsWith('image/') || !file.type) {
    return compressImage(file)
  }
  throw new Error('Use a photo or video')
}

export function isVideoDataUrl(src: string | null | undefined): boolean {
  return !!src && /^data:video\//i.test(src)
}

'use client'

import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

type Props = {
  board: ReactNode
  overlay: ReactNode | null
  chat: ReactNode | null
}

const STORAGE_CHAT_WIDTH = 'h2h-board-chat-width'
const STORAGE_CHAT_HEIGHT = 'h2h-board-chat-height'

const DEFAULT_CHAT_WIDTH = 280
const MIN_CHAT_WIDTH = 200
const MAX_CHAT_WIDTH = 560

const DEFAULT_CHAT_HEIGHT = 280
const MIN_CHAT_HEIGHT = 160
const MAX_CHAT_HEIGHT = 640

function readStoredNumber(key: string, fallback: number, min: number, max: number) {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const n = Number(raw)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, Math.round(n)))
  } catch {
    return fallback
  }
}

function useMobileViewportOverlay() {
  const [ready, setReady] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)')
    const sync = () => setMobile(mq.matches)
    sync()
    setReady(true)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return { ready, mobile }
}

export default function TodGameLayout({ board, overlay, chat }: Props) {
  const { ready, mobile } = useMobileViewportOverlay()
  const layoutRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const chatWidthRef = useRef(DEFAULT_CHAT_WIDTH)
  const chatHeightRef = useRef(DEFAULT_CHAT_HEIGHT)

  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH)
  const [chatHeight, setChatHeight] = useState(DEFAULT_CHAT_HEIGHT)

  useEffect(() => {
    const w = readStoredNumber(STORAGE_CHAT_WIDTH, DEFAULT_CHAT_WIDTH, MIN_CHAT_WIDTH, MAX_CHAT_WIDTH)
    const h = readStoredNumber(STORAGE_CHAT_HEIGHT, DEFAULT_CHAT_HEIGHT, MIN_CHAT_HEIGHT, MAX_CHAT_HEIGHT)
    chatWidthRef.current = w
    chatHeightRef.current = h
    setChatWidth(w)
    setChatHeight(h)
  }, [])

  // Wait until we know mobile vs desktop so the overlay mounts once in the
  // correct place (body portal vs board column) and doesn't remount mid-write.
  const overlayNode =
    overlay && ready ? (
      <div className={`board-stage-overlay${mobile ? ' board-stage-overlay--viewport' : ''}`}>
        <div className="board-stage-overlay-inner">{overlay}</div>
      </div>
    ) : null

  const onPointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const el = layoutRef.current
      if (!el || !draggingRef.current) return
      const rect = el.getBoundingClientRect()

      if (mobile) {
        // Handle sits between board (top) and chat (bottom). Dragging down grows chat.
        const fromBottom = rect.bottom - clientY
        const next = Math.min(
          Math.min(MAX_CHAT_HEIGHT, Math.round(rect.height * 0.72)),
          Math.max(MIN_CHAT_HEIGHT, Math.round(fromBottom))
        )
        chatHeightRef.current = next
        setChatHeight(next)
      } else {
        const fromRight = rect.right - clientX
        const next = Math.min(
          Math.min(MAX_CHAT_WIDTH, Math.round(rect.width * 0.55)),
          Math.max(MIN_CHAT_WIDTH, Math.round(fromRight))
        )
        chatWidthRef.current = next
        setChatWidth(next)
      }
    },
    [mobile]
  )

  const stopDrag = useCallback(() => {
    if (!draggingRef.current) return
    draggingRef.current = false
    document.body.classList.remove('board-split-dragging')
    try {
      if (mobile) localStorage.setItem(STORAGE_CHAT_HEIGHT, String(chatHeightRef.current))
      else localStorage.setItem(STORAGE_CHAT_WIDTH, String(chatWidthRef.current))
    } catch {
      /* ignore */
    }
  }, [mobile])

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!draggingRef.current) return
      e.preventDefault()
      onPointerMove(e.clientX, e.clientY)
    }
    function onUp() {
      stopDrag()
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [onPointerMove, stopDrag])

  function startDrag(e: ReactPointerEvent<HTMLButtonElement>) {
    if (!chat) return
    e.preventDefault()
    draggingRef.current = true
    document.body.classList.add('board-split-dragging')
    e.currentTarget.setPointerCapture?.(e.pointerId)
    onPointerMove(e.clientX, e.clientY)
  }

  const hasChat = !!chat
  const style = hasChat
    ? (mobile
        ? ({ ['--board-chat-size' as string]: `${chatHeight}px` } as CSSProperties)
        : ({ ['--board-chat-size' as string]: `${chatWidth}px` } as CSSProperties))
    : undefined

  return (
    <div
      ref={layoutRef}
      className={`board-play-layout${hasChat ? ' board-play-layout-split' : ' board-play-layout-solo'}${
        mobile ? ' board-play-layout-mobile' : ''
      }`}
      style={style}
    >
      <div className="board-main-col">
        {board}
        {overlayNode && (mobile ? createPortal(overlayNode, document.body) : overlayNode)}
      </div>
      {hasChat && (
        <>
          <button
            type="button"
            className="board-split-handle"
            aria-label={mobile ? 'Drag to resize chat height' : 'Drag to resize chat width'}
            title="Drag to resize"
            onPointerDown={startDrag}
          >
            <span className="board-split-handle-bar" aria-hidden />
          </button>
          <aside className="board-chat-col">{chat}</aside>
        </>
      )}
    </div>
  )
}

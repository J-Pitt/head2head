'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'

type Props = {
  board: ReactNode
  overlay: ReactNode | null
  chat: ReactNode | null
}

function useMobileViewportOverlay() {
  const [mounted, setMounted] = useState(false)
  const [mobile, setMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(max-width: 899px)')
    const sync = () => setMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  return { mounted, mobile }
}

export default function TodGameLayout({ board, overlay, chat }: Props) {
  const { mounted, mobile } = useMobileViewportOverlay()
  const useViewportOverlay = mounted && mobile

  const overlayNode = overlay ? (
    <div className={`board-stage-overlay${useViewportOverlay ? ' board-stage-overlay--viewport' : ''}`}>
      <div className="board-stage-overlay-inner">{overlay}</div>
    </div>
  ) : null

  return (
    <div className={`board-play-layout${chat ? '' : ' board-play-layout-solo'}`}>
      <div className="board-main-col">
        {board}
        {overlayNode &&
          (useViewportOverlay
            ? createPortal(overlayNode, document.body)
            : overlayNode)}
      </div>
      {chat && <aside className="board-chat-col">{chat}</aside>}
    </div>
  )
}

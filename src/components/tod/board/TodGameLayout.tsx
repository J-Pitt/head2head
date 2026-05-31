'use client'

import type { ReactNode } from 'react'

type Props = {
  board: ReactNode
  overlay: ReactNode | null
  chat: ReactNode | null
}

export default function TodGameLayout({ board, overlay, chat }: Props) {
  return (
    <div className={`board-play-layout${chat ? '' : ' board-play-layout-solo'}`}>
      <div className="board-main-col">
        {board}
        {overlay && (
          <div className="board-stage-overlay">
            <div className="board-stage-overlay-inner">{overlay}</div>
          </div>
        )}
      </div>
      {chat && <aside className="board-chat-col">{chat}</aside>}
    </div>
  )
}

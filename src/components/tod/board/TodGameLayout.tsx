'use client'

import type { ReactNode } from 'react'

type Props = {
  stage: ReactNode
  board: ReactNode
  chat: ReactNode
}

export default function TodGameLayout({ stage, board, chat }: Props) {
  return (
    <div className="board-play-layout">
      <aside className="board-stage-col">{stage}</aside>
      <div className="board-center-col">{board}</div>
      <aside className="board-chat-col">{chat}</aside>
    </div>
  )
}

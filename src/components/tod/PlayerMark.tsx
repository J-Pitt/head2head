import Avatar from '@/components/Avatar'
import BoardPiece from '@/components/tod/BoardPiece'
import { isBoardPiece } from '@/lib/tod/boardPieces'

type Props = {
  avatar: string
  size?: number
  className?: string
  board?: boolean
}

export default function PlayerMark({ avatar, size = 40, className, board }: Props) {
  if (board || isBoardPiece(avatar)) {
    return <BoardPiece pieceId={avatar} size={size} className={className} />
  }
  return <Avatar seed={avatar} size={size} className={className} />
}

import MinigameRouter from '@/components/minigames/MinigameRouter'
import { getMinigame, type MinigameId } from '@/lib/minigames/catalog'
import { notFound } from 'next/navigation'

type Props = { params: Promise<{ gameId: string }> }

export async function generateMetadata({ params }: Props) {
  const { gameId } = await params
  const meta = getMinigame(gameId)
  return { title: meta ? `${meta.label} — Head2Head` : 'Mini game' }
}

export default async function MinigamePage({ params }: Props) {
  const { gameId } = await params
  if (!getMinigame(gameId)) notFound()
  return <MinigameRouter gameId={gameId as MinigameId} />
}

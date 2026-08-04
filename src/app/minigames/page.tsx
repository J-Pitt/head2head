import { Suspense } from 'react'
import MinigameParty from '@/components/minigames/MinigameParty'

export const metadata = {
  title: 'Mini games — Truth or Dare',
  description: 'Join a games room and play arcade mini games with friends.',
}

export default function MinigamesPage() {
  return (
    <Suspense fallback={null}>
      <MinigameParty />
    </Suspense>
  )
}

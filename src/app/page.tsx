import { Suspense } from 'react'
import GameApp from '@/components/GameApp'

export default function Home() {
  return (
    <Suspense fallback={null}>
      <GameApp />
    </Suspense>
  )
}

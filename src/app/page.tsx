import { Suspense } from 'react'
import BoardGameHome from '@/components/BoardGameHome'

export default function Home() {
  return (
    <Suspense fallback={null}>
      <BoardGameHome />
    </Suspense>
  )
}

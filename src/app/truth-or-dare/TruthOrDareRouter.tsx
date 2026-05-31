'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import TruthOrDare from '@/components/tod/TruthOrDare'
import ClassicTruthOrDare from '@/components/tod/classic/ClassicTruthOrDare'

function Inner() {
  const params = useSearchParams()
  if (params.get('classic') === '1') return <ClassicTruthOrDare />
  return <TruthOrDare />
}

export default function TruthOrDareRouter() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  )
}

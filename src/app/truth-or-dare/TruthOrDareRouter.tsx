'use client'

import { Suspense } from 'react'
import TruthOrDare from '@/components/tod/TruthOrDare'

export default function TruthOrDareRouter() {
  return (
    <Suspense fallback={null}>
      <TruthOrDare />
    </Suspense>
  )
}

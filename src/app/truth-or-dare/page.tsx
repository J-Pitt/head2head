import { Suspense } from 'react'
import TruthOrDareRouter from './TruthOrDareRouter'

export const metadata = {
  title: 'Truth or Dare — Board game edition',
  description: 'Roll the dice, land on truth and dare tiles, and race to the finish.',
}

export default function TruthOrDarePage() {
  return (
    <Suspense fallback={null}>
      <TruthOrDareRouter />
    </Suspense>
  )
}

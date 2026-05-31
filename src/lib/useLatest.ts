import { useEffect, useRef } from 'react'

/** Keep a ref in sync with the latest value without updating during render. */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => {
    ref.current = value
  })
  return ref
}

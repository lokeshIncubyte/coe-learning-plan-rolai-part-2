import { useEffect, useRef } from 'react'

export function useScrollToBottom<T extends HTMLElement>(dependency: unknown) {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom < 100) {
      el.scrollTo({ top: el.scrollHeight })
    }
  }, [dependency])
  return ref
}

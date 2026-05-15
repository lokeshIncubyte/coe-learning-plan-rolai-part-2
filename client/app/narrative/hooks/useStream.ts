import { useState } from 'react'
import type { StreamEvent } from '../lib/parseStreamEvents'

export function useStream(url: string, onEvent: (event: StreamEvent) => void) {
  const [isStreaming, setIsStreaming] = useState(false)

  const start = (body: object) => {
    setIsStreaming(true)
    fetch(url, { method: 'POST', body: JSON.stringify(body) })
  }

  return { start, isStreaming }
}

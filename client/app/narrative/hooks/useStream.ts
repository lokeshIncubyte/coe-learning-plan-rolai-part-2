import { useState } from 'react'
import { parseStreamEvents } from '../lib/parseStreamEvents'
import type { StreamEvent } from '../lib/parseStreamEvents'

export function useStream(url: string, onEvent: (event: StreamEvent) => void) {
  const [isStreaming, setIsStreaming] = useState(false)

  const start = async (body: object) => {
    setIsStreaming(true)
    try {
      const response = await fetch(url, { method: 'POST', body: JSON.stringify(body) })
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const events = parseStreamEvents(decoder.decode(value))
        for (const event of events) {
          onEvent(event)
        }
      }
    } catch (err) {
      onEvent({ type: 'error', message: err instanceof Error ? err.message : String(err) })
    } finally {
      setIsStreaming(false)
    }
  }

  return { start, isStreaming }
}

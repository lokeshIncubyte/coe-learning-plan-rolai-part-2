import { useEffect, useRef, useState } from 'react'
import { parseStreamEvents } from '../lib/parseStreamEvents'
import type { StreamEvent } from '../lib/parseStreamEvents'

export function useStream(url: string, onEvent: (event: StreamEvent) => void) {
  const [isStreaming, setIsStreaming] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => { controllerRef.current?.abort() }
  }, [])

  const start = async (body: object) => {
    const controller = new AbortController()
    controllerRef.current = controller
    setIsStreaming(true)
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') ?? '' : ''
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
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
      if (err instanceof Error && err.name !== 'AbortError') {
        onEvent({ type: 'error', message: err.message })
      }
    } finally {
      if (controllerRef.current === controller) {
        setIsStreaming(false)
      }
    }
  }

  return { start, isStreaming }
}

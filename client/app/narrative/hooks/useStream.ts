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
    try {
      const response = await fetch(url, {
        method: 'POST',
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
      // Only clear the streaming flag if this is still the active controller.
      // In React Strict Mode, the effect fires twice: the first invocation is
      // aborted (cleanup runs), then a second starts. Without this guard, the
      // aborted invocation's finally block would set isStreaming=false and
      // stomp the second invocation's isStreaming=true, keeping the input
      // enabled for the duration of the real LLM stream.
      if (controllerRef.current === controller) {
        setIsStreaming(false)
      }
    }
  }

  return { start, isStreaming }
}

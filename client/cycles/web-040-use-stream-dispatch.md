---
id: web-040
slug: use-stream-dispatch
status: done
exec: use /exec-cycle to execute this cycle
source: "useStream hook — reads ReadableStream chunks, parses with parseStreamEvents, dispatches each event to onEvent, sets isStreaming false on completion"
covers: happy-path
group: use-stream
---

## Behavior
After `start()` is called, `useStream` reads the response body as a `ReadableStream`, decodes each chunk, parses newline-delimited JSON using `parseStreamEvents`, and dispatches each resulting `StreamEvent` to `onEvent`. When the reader signals `done`, `isStreaming` is set back to `false`.

## RED
- **Test file**: `app/narrative/__tests__/useStream.test.tsx` (append to the file — do NOT recreate it; the imports and `beforeEach` from web-039 are already present). The file will contain 2 `describe` blocks after this append.
- **Assertion**:
  ```tsx
  // Append below the existing describe block in useStream.test.tsx.
  // makeStream is a module-scope helper — place it OUTSIDE and BEFORE the new describe block.

  function makeStream(...lines: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder()
    return new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line + '\n'))
        }
        controller.close()
      },
    })
  }

  describe('useStream — event dispatch', () => {
    it('calls onEvent for each parsed event and resets isStreaming when stream completes', async () => {
      const onEvent = jest.fn()
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        body: makeStream(
          '{"type":"start"}',
          '{"type":"chunk","content":"Hello"}',
          '{"type":"done"}',
        ),
      })

      const { result } = renderHook(() => useStream('http://test', onEvent))

      await act(async () => {
        await result.current.start({})
      })

      expect(onEvent).toHaveBeenCalledWith({ type: 'start' })
      expect(onEvent).toHaveBeenCalledWith({ type: 'chunk', content: 'Hello' })
      expect(onEvent).toHaveBeenCalledWith({ type: 'done' })
      expect(result.current.isStreaming).toBe(false)
    })
  })
  ```
- **Why it fails**: GREEN-039's `start()` fires a fetch but never reads `response.body` — `onEvent` is never called and `isStreaming` stays `true`.

## GREEN
- **Smallest change**: Replace `start` in `useStream.ts` with an async version that reads the body using `getReader()`, decodes with `TextDecoder`, calls `parseStreamEvents`, dispatches each event, and resets `isStreaming` in a `finally` block:
  ```ts
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
      } finally {
        setIsStreaming(false)
      }
    }

    return { start, isStreaming }
  }
  ```
- **Files touched**: `app/narrative/hooks/useStream.ts`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

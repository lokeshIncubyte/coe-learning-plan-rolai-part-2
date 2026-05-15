---
id: cycle-042
slug: use-stream-abort
status: done
exec: use /exec-cycle to execute this cycle
source: "useStream error path — when component unmounts mid-stream, fetch is aborted via AbortController and isStreaming resets to false"
covers: error-path
group: use-stream
---

## Behavior
`useStream` creates an `AbortController` when `start()` is called and passes its `signal` to `fetch`. A `useEffect` cleanup function calls `controller.abort()` on unmount, cancelling any in-flight request. When the fetch is aborted, the resulting `AbortError` is swallowed (not forwarded to `onEvent`).

## RED
- **Test file**: `app/narrative/__tests__/useStream.test.tsx` (append a new `describe` block — do NOT recreate the file). The file will contain 4 `describe` blocks after this append.
- **Assertion**:
  ```tsx
  // Append below the existing describe blocks in useStream.test.tsx

  describe('useStream — abort on unmount', () => {
    it('aborts the in-flight fetch when unmounted', () => {
      let capturedSignal: AbortSignal | undefined

      global.fetch = jest.fn().mockImplementation((_url: string, opts?: RequestInit) => {
        capturedSignal = opts?.signal
        return new Promise(() => {}) // never resolves
      })

      const { result, unmount } = renderHook(() => useStream('http://test', jest.fn()))

      act(() => { result.current.start({}) })
      expect(capturedSignal).toBeDefined()
      expect(capturedSignal!.aborted).toBe(false)

      unmount()

      expect(capturedSignal!.aborted).toBe(true)
    })
  })
  ```
- **Why it fails**: GREEN-041 passes no `signal` to `fetch` — `capturedSignal` is `undefined` and `expect(capturedSignal).toBeDefined()` fails.

## GREEN
- **Smallest change**: Add `useRef<AbortController | null>` and a `useEffect` cleanup; pass the controller's `signal` to `fetch`; guard the `catch` block to swallow `AbortError`:
  ```ts
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
      controllerRef.current = new AbortController()
      setIsStreaming(true)
      try {
        const response = await fetch(url, {
          method: 'POST',
          body: JSON.stringify(body),
          signal: controllerRef.current.signal,
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

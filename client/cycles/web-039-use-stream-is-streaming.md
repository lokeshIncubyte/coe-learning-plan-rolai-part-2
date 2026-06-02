---
id: web-039
slug: use-stream-is-streaming
status: done
exec: use /exec-cycle to execute this cycle
source: "useStream hook — isStreaming is false initially, becomes true after start()"
covers: happy-path
group: use-stream
---

## Behavior
`useStream` is a hook exported from `app/narrative/hooks/useStream.ts`. It accepts `url: string` and `onEvent: (event: StreamEvent) => void`. It exposes `{ start, isStreaming }`. `isStreaming` starts as `false`. After `start(body)` is called, `isStreaming` becomes `true`. This cycle's GREEN only wires the state flag — stream body processing is added in web-040.

## RED
- **Test file**: `app/narrative/__tests__/useStream.test.tsx`
- **Assertion**:
  ```tsx
  import { renderHook, act } from '@testing-library/react'
  import { useStream } from '../hooks/useStream'

  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() => new Promise(() => {})) // never resolves
  })

  describe('useStream — isStreaming', () => {
    it('isStreaming is false initially', () => {
      const { result } = renderHook(() => useStream('http://test', jest.fn()))
      expect(result.current.isStreaming).toBe(false)
    })

    it('isStreaming becomes true after start() is called', () => {
      const { result } = renderHook(() => useStream('http://test', jest.fn()))
      act(() => { result.current.start({}) })
      expect(result.current.isStreaming).toBe(true)
    })
  })
  ```
- **Why it fails**: `app/narrative/hooks/useStream.ts` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/hooks/useStream.ts`. `start()` sets `isStreaming = true` and fires a fetch but does NOT process the response body (that is added in web-040):
  ```ts
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
  ```
- **Files touched**: `app/narrative/hooks/useStream.ts`

## Notes
- `onEvent` is declared as a parameter but not used in this cycle's GREEN. This is safe: the project `tsconfig.json` does not set `noUnusedParameters` (only `strict: true`, which does not imply it), and `ts-jest` does not add it. No `void onEvent` workaround is needed.
- The `fetch(...)` call is unawaited (fire-and-forget). TypeScript does not warn about floating promises without an explicit ESLint rule (`@typescript-eslint/no-floating-promises`), which is not enforced during `jest`. This is intentional — body reading is added in web-040.

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

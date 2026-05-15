---
id: cycle-028
slug: use-scroll-to-bottom
status: done
exec: use /exec-cycle to execute this cycle
source: "useScrollToBottom hook — accepts a dependency value; returns a ref to attach to the scroll container; scrolls to bottom when dependency changes only if the container is already near the bottom (within 100px)"
covers: happy-path
---

## Behavior
`useScrollToBottom(dependency)` returns a React ref. When `dependency` changes, the hook checks if the element attached to the ref is within 100px of its scroll bottom (`scrollHeight - scrollTop - clientHeight < 100`). If so, it calls `scrollTo({ top: scrollHeight })`. If not, it does nothing.

## RED
- **Test file**: `app/narrative/__tests__/useScrollToBottom.test.tsx`
- **Assertion**:
  ```tsx
  import { renderHook } from '@testing-library/react'
  import { useScrollToBottom } from '../hooks/useScrollToBottom'

  function makeContainer(scrollTop: number, scrollHeight: number, clientHeight: number) {
    return {
      scrollTop,
      scrollHeight,
      clientHeight,
      scrollTo: jest.fn(),
    }
  }

  describe('useScrollToBottom', () => {
    it('scrolls to bottom when container is near bottom', () => {
      const container = makeContainer(900, 1000, 95)  // 5px from bottom
      const { result, rerender } = renderHook(({ dep }) => useScrollToBottom(dep), {
        initialProps: { dep: 0 },
      })
      result.current.current = container as unknown as HTMLElement
      rerender({ dep: 1 })
      expect(container.scrollTo).toHaveBeenCalledWith({ top: 1000 })
    })

    it('does not scroll when container is far from bottom', () => {
      const container = makeContainer(0, 1000, 200)  // 800px from bottom
      const { result, rerender } = renderHook(({ dep }) => useScrollToBottom(dep), {
        initialProps: { dep: 0 },
      })
      result.current.current = container as unknown as HTMLElement
      rerender({ dep: 1 })
      expect(container.scrollTo).not.toHaveBeenCalled()
    })
  })
  ```
- **Why it fails**: `app/narrative/hooks/useScrollToBottom.ts` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/hooks/useScrollToBottom.ts`:
  ```ts
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
  ```
- **Files touched**: `app/narrative/hooks/useScrollToBottom.ts`

## REFACTOR
none

---

> **Status: done** — already executed.

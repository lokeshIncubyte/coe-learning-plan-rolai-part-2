---
id: web-034
slug: use-optimistic-action
status: done
exec: use /exec-cycle to execute this cycle
source: "useOptimisticAction hook — addAction sets pendingAction immediately; confirmAction clears on accepted/modified or reverts to null on rejected"
covers: happy-path
---

## Behavior
`useOptimisticAction()` returns `{ pendingAction, addAction, confirmAction }`. Calling `addAction(text)` sets `pendingAction` to `text`. Calling `confirmAction('accepted')` or `confirmAction('modified')` clears `pendingAction` to `null`. Calling `confirmAction('rejected')` also clears `pendingAction` to `null`.

## RED
- **Test file**: `app/narrative/__tests__/useOptimisticAction.test.tsx`
- **Assertion**:
  ```tsx
  import { act, renderHook } from '@testing-library/react'
  import { useOptimisticAction } from '../hooks/useOptimisticAction'

  describe('useOptimisticAction', () => {
    it('starts with null pendingAction', () => {
      const { result } = renderHook(() => useOptimisticAction())
      expect(result.current.pendingAction).toBeNull()
    })

    it('sets pendingAction when addAction is called', () => {
      const { result } = renderHook(() => useOptimisticAction())
      act(() => { result.current.addAction('attack the guard') })
      expect(result.current.pendingAction).toBe('attack the guard')
    })

    it('clears pendingAction when confirmAction is called with accepted', () => {
      const { result } = renderHook(() => useOptimisticAction())
      act(() => { result.current.addAction('flee') })
      act(() => { result.current.confirmAction('accepted') })
      expect(result.current.pendingAction).toBeNull()
    })

    it('clears pendingAction when confirmAction is called with modified', () => {
      const { result } = renderHook(() => useOptimisticAction())
      act(() => { result.current.addAction('flee') })
      act(() => { result.current.confirmAction('modified') })
      expect(result.current.pendingAction).toBeNull()
    })

    it('clears pendingAction when confirmAction is called with rejected', () => {
      const { result } = renderHook(() => useOptimisticAction())
      act(() => { result.current.addAction('phase through wall') })
      act(() => { result.current.confirmAction('rejected') })
      expect(result.current.pendingAction).toBeNull()
    })
  })
  ```
- **Why it fails**: `app/narrative/hooks/useOptimisticAction.ts` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/hooks/useOptimisticAction.ts`:
  ```ts
  import { useState } from 'react'

  type Status = 'accepted' | 'modified' | 'rejected'

  export function useOptimisticAction() {
    const [pendingAction, setPendingAction] = useState<string | null>(null)

    const addAction = (text: string) => setPendingAction(text)
    const confirmAction = (_status: Status) => setPendingAction(null)

    return { pendingAction, addAction, confirmAction }
  }
  ```
- **Files touched**: `app/narrative/hooks/useOptimisticAction.ts`

## REFACTOR
none

---

> **Execute:** Run the `/exec-cycle` skill to execute this cycle (RED → GREEN → squash merge).

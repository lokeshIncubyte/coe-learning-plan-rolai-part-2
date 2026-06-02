---
id: web-045
slug: use-stream-state-done
status: done
exec: use /exec-cycle to execute this cycle
source: "useStreamState hook — done event transitions status to 'done'"
covers: happy-path
group: use-stream-state
---

## Behavior
Calling `dispatch({ type: 'done' })` sets `status` to `'done'`. Other fields are preserved.

## RED
- **Test file**: `app/narrative/__tests__/useStreamState.test.tsx` (append a new `describe` block — do NOT recreate the file)
- **Assertion**:
  ```tsx
  // Append below the existing describe blocks in useStreamState.test.tsx

  describe('useStreamState — done', () => {
    it('transitions to done status on done event', () => {
      const { result } = renderHook(() => useStreamState())
      act(() => { result.current.dispatch({ type: 'start' }) })
      act(() => { result.current.dispatch({ type: 'done' }) })
      expect(result.current.status).toBe('done')
    })
  })
  ```
- **Why it fails**: GREEN-044's reducer has no `done` case — `status` stays `'streaming'` after dispatch.

## GREEN
- **Smallest change**: Add a `done` case to the reducer:
  ```ts
  case 'done':
    return { ...state, status: 'done' }
  ```
- **Files touched**: `app/narrative/hooks/useStreamState.ts`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

---
id: web-047
slug: use-stream-state-error
status: done
exec: use /exec-cycle to execute this cycle
source: "useStreamState hook — error event transitions status to 'error' and sets errorMessage"
covers: error-path
group: use-stream-state
---

## Behavior
Calling `dispatch({ type: 'error', message: '...' })` sets `status` to `'error'` and sets `errorMessage` to the provided message.

## RED
- **Test file**: `app/narrative/__tests__/useStreamState.test.tsx` (append a new `describe` block — do NOT recreate the file)
- **Assertion**:
  ```tsx
  // Append below the existing describe blocks in useStreamState.test.tsx

  describe('useStreamState — error', () => {
    it('transitions to error status and sets errorMessage on error event', () => {
      const { result } = renderHook(() => useStreamState())
      act(() => { result.current.dispatch({ type: 'start' }) })
      act(() => { result.current.dispatch({ type: 'error', message: 'Something went wrong' }) })
      expect(result.current.status).toBe('error')
      expect(result.current.errorMessage).toBe('Something went wrong')
    })
  })
  ```
- **Why it fails**: GREEN-046's reducer has no `error` case — `status` stays `'streaming'` and `errorMessage` stays `''`.

## GREEN
- **Smallest change**: Add an `error` case to the reducer:
  ```ts
  case 'error':
    return { ...state, status: 'error', errorMessage: action.message as string }
  ```
- **Files touched**: `app/narrative/hooks/useStreamState.ts`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

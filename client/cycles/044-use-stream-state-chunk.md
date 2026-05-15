---
id: cycle-044
slug: use-stream-state-chunk
status: done
exec: use /exec-cycle to execute this cycle
source: "useStreamState hook — chunk event appends content to narrativeText"
covers: happy-path
group: use-stream-state
---

## Behavior
Calling `dispatch({ type: 'chunk', content: '...' })` appends the content string to `narrativeText`. Multiple chunk dispatches concatenate in order.

## RED
- **Test file**: `app/narrative/__tests__/useStreamState.test.tsx` (append a new `describe` block — do NOT recreate the file; imports from cycle-043 are already present)
- **Assertion**:
  ```tsx
  // Append below the existing describe block in useStreamState.test.tsx

  describe('useStreamState — chunk', () => {
    it('appends content to narrativeText on chunk event', () => {
      const { result } = renderHook(() => useStreamState())
      act(() => { result.current.dispatch({ type: 'chunk', content: 'Hello' }) })
      act(() => { result.current.dispatch({ type: 'chunk', content: ' World' }) })
      expect(result.current.narrativeText).toBe('Hello World')
    })
  })
  ```
- **Why it fails**: GREEN-043's reducer has no `chunk` case — `narrativeText` stays `''` after dispatch.

## GREEN
- **Smallest change**: Add a `chunk` case to the reducer in `useStreamState.ts`:
  ```ts
  case 'chunk':
    return { ...state, narrativeText: state.narrativeText + (action.content as string) }
  ```
- **Files touched**: `app/narrative/hooks/useStreamState.ts`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

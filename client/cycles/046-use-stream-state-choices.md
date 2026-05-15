---
id: cycle-046
slug: use-stream-state-choices
status: done
exec: use /exec-cycle to execute this cycle
source: "useStreamState hook — choices event sets the choices array"
covers: happy-path
group: use-stream-state
---

## Behavior
Calling `dispatch({ type: 'choices', choices: [...] })` replaces `choices` with the provided array.

## RED
- **Test file**: `app/narrative/__tests__/useStreamState.test.tsx` (append a new `describe` block — do NOT recreate the file)
- **Assertion**:
  ```tsx
  // Append below the existing describe blocks in useStreamState.test.tsx

  describe('useStreamState — choices', () => {
    it('sets choices array on choices event', () => {
      const { result } = renderHook(() => useStreamState())
      act(() => {
        result.current.dispatch({ type: 'choices', choices: [{ label: 'Fight' }, { label: 'Flee' }] })
      })
      expect(result.current.choices).toEqual([{ label: 'Fight' }, { label: 'Flee' }])
    })
  })
  ```
- **Why it fails**: GREEN-045's reducer has no `choices` case — `choices` stays `[]` after dispatch.

## GREEN
- **Smallest change**: Add a `choices` case to the reducer:
  ```ts
  case 'choices':
    return { ...state, choices: action.choices as { label: string }[] }
  ```
- **Files touched**: `app/narrative/hooks/useStreamState.ts`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

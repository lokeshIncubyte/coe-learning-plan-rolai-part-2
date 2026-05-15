---
id: cycle-036
slug: use-narrative-history-set-action
status: pending
exec: use /exec-cycle to execute this cycle
source: "useNarrativeHistory hook — setChosenAction(index, action) updates the chosenAction for the beat at the given index"
covers: happy-path
group: use-narrative-history
---

## Behavior
`useNarrativeHistory()` gains a `setChosenAction(index, action)` function. Calling it updates the `chosenAction` field of the beat at `index` without mutating other beats.

## RED
- **Test file**: `app/narrative/__tests__/useNarrativeHistory.test.tsx`
- **Assertion** (append to the existing test file — do NOT recreate it; imports are already present):
  ```tsx
  describe('useNarrativeHistory — setChosenAction', () => {
    it('updates chosenAction for the beat at the given index', () => {
      const { result } = renderHook(() => useNarrativeHistory())
      act(() => { result.current.addBeat('Beat one.') })
      act(() => { result.current.addBeat('Beat two.') })
      act(() => { result.current.setChosenAction(0, 'Attack') })
      expect(result.current.beats[0].chosenAction).toBe('Attack')
      expect(result.current.beats[1].chosenAction).toBeNull()
    })

    it('does not mutate other beats when setting chosenAction', () => {
      const { result } = renderHook(() => useNarrativeHistory())
      act(() => { result.current.addBeat('Beat one.') })
      act(() => { result.current.addBeat('Beat two.') })
      act(() => { result.current.setChosenAction(1, 'Flee') })
      expect(result.current.beats[0].chosenAction).toBeNull()
      expect(result.current.beats[1].chosenAction).toBe('Flee')
    })
  })
  ```
- **Why it fails**: `setChosenAction` is not returned by `useNarrativeHistory` — cycle-035's GREEN explicitly omits it, so calling `result.current.setChosenAction(...)` throws `TypeError: result.current.setChosenAction is not a function`.

## GREEN
- **Smallest change**: Add `setChosenAction` to `useNarrativeHistory.ts`:
  ```ts
  const setChosenAction = (index: number, action: string) =>
    setBeats((prev) =>
      prev.map((beat, i) => (i === index ? { ...beat, chosenAction: action } : beat))
    )

  return { beats, addBeat, setChosenAction }
  ```
- **Files touched**: `app/narrative/hooks/useNarrativeHistory.ts`

## REFACTOR
none

---

> **Execute:** Run the `/exec-cycle` skill to execute this cycle (RED → GREEN → squash merge).

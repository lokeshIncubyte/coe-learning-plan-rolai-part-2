---
id: cycle-035
slug: use-narrative-history-add-beat
status: done
exec: use /exec-cycle to execute this cycle
source: "useNarrativeHistory hook — addBeat(narrative) appends a beat with null chosenAction"
covers: happy-path
group: use-narrative-history
---

## Behavior
`useNarrativeHistory()` returns `{ beats, addBeat, setChosenAction }`. Initially `beats` is an empty array. Calling `addBeat(narrative)` appends `{ narrative, chosenAction: null }` to `beats`. Multiple calls accumulate in order.

## RED
- **Test file**: `app/narrative/__tests__/useNarrativeHistory.test.tsx`
- **Assertion**:
  ```tsx
  import { act, renderHook } from '@testing-library/react'
  import { useNarrativeHistory } from '../hooks/useNarrativeHistory'

  describe('useNarrativeHistory — addBeat', () => {
    it('starts with empty beats array', () => {
      const { result } = renderHook(() => useNarrativeHistory())
      expect(result.current.beats).toEqual([])
    })

    it('appends a beat with null chosenAction when addBeat is called', () => {
      const { result } = renderHook(() => useNarrativeHistory())
      act(() => { result.current.addBeat('The hero entered the cave.') })
      expect(result.current.beats).toEqual([
        { narrative: 'The hero entered the cave.', chosenAction: null },
      ])
    })

    it('accumulates multiple beats in order', () => {
      const { result } = renderHook(() => useNarrativeHistory())
      act(() => { result.current.addBeat('Beat one.') })
      act(() => { result.current.addBeat('Beat two.') })
      expect(result.current.beats).toEqual([
        { narrative: 'Beat one.', chosenAction: null },
        { narrative: 'Beat two.', chosenAction: null },
      ])
    })
  })
  ```
- **Why it fails**: `app/narrative/hooks/useNarrativeHistory.ts` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/hooks/useNarrativeHistory.ts` with only `addBeat` — omit `setChosenAction` so cycle-036 has a genuine RED:
  ```ts
  import { useState } from 'react'

  export type Beat = { narrative: string; chosenAction: string | null }

  export function useNarrativeHistory() {
    const [beats, setBeats] = useState<Beat[]>([])

    const addBeat = (narrative: string) =>
      setBeats((prev) => [...prev, { narrative, chosenAction: null }])

    return { beats, addBeat }
  }
  ```
- **Files touched**: `app/narrative/hooks/useNarrativeHistory.ts`

## REFACTOR
none

---

> **Execute:** Run the `/exec-cycle` skill to execute this cycle (RED → GREEN → squash merge).

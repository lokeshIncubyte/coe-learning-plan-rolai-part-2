---
id: cycle-057
slug: beat-history-persists-after-done
status: done
source: "item 4 — previous beat stays visible after new beat loads"
covers: atomic
---

## Behavior
Each time a stream completes (i.e., a `done` event fires), the accumulated `narrativeText` for that round should be committed to the beat history via `addBeat`. Because `BeatHistory` renders all past beats, previously completed narrative paragraphs remain visible even as a new stream round begins. This gives the player a continuous, scrollable story log.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup for useNarrativeHistory is already in place from cycle-056.
  // narrativeHistoryState.addBeat, narrativeHistoryState.beats are available.
  // beforeEach resets narrativeHistoryState.beats = [] and clears mocks.

  describe('NarrativePage', () => {
    it('calls addBeat with the accumulated narrative text when done fires', () => {
      render(<NarrativePage />)

      act(() => { capturedOnEvent!({ type: 'start' }) })
      act(() => { capturedOnEvent!({ type: 'chunk', content: 'Round one text.' }) })
      act(() => { capturedOnEvent!({ type: 'done' }) })

      expect(narrativeHistoryState.addBeat).toHaveBeenCalledWith('Round one text.')
    })
  })
  ```
- **Why it fails**: After cycle-056's GREEN, `addBeat` is never called in the `onEvent` handler — the `done` event only dispatches to `useStreamState`. `narrativeHistoryState.addBeat` remains uncalled and the assertion fails.

## GREEN
- **Smallest change**: In the `onEvent` callback, handle the `done` event by calling `addBeat(narrativeText)` before dispatching `{ type: 'done' }`. The `narrativeText` from the render closure holds the current accumulated text because each `chunk` dispatch triggers a re-render and the `capturedOnEvent` reference is updated before the next `act()` call fires.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
Consider whether `narrativeText` closure is reliably up-to-date when `done` fires in production (rapid server sends with no render in between). If stale closures are a concern, replace with `const narrativeAccumRef = useRef<string>('')`, increment it on every `chunk` event, pass it to `addBeat` on `done`, then reset it to `''`.

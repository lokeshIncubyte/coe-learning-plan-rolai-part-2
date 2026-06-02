---
id: web-056
slug: chosen-action-recorded-on-click
status: done
source: "item 5 — setChosenAction called with correct label"
covers: atomic
---

## Behavior
When the player selects a choice, `NarrativePage` must record which action was chosen on the most recently completed beat so that `BeatHistory` can display it. This requires calling `setChosenAction(beats.length - 1, label)` from `useNarrativeHistory` and rendering `<BeatHistory beats={beats} />` so the chosen action becomes visible in the DOM.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Add to the module-level block (alongside useStream and useScrollToBottom mocks).
  // Jest hoisting requires mock variables to be declared with `var` when referenced
  // inside jest.mock factories, or constructed entirely inside the factory.
  // Use a mutable holder object to sidestep this restriction.

  const narrativeHistoryState = {
    beats: [] as { narrative: string; chosenAction: string | null }[],
    addBeat: jest.fn(),
    setChosenAction: jest.fn(),
  }

  jest.mock('../hooks/useNarrativeHistory', () => ({
    useNarrativeHistory: () => narrativeHistoryState,
  }))

  // Extend the existing beforeEach to also reset narrative history:
  //   narrativeHistoryState.beats = []
  //   narrativeHistoryState.addBeat.mockClear()
  //   narrativeHistoryState.setChosenAction.mockClear()

  describe('NarrativePage', () => {
    it('records the chosen action on the current beat when a choice is clicked', async () => {
      const user = userEvent.setup()
      // Seed one beat so setChosenAction has a valid index to target
      narrativeHistoryState.beats = [{ narrative: 'You stand at a crossroads.', chosenAction: null }]
      render(<NarrativePage />)

      act(() => {
        capturedOnEvent!({ type: 'choices', choices: [{ label: 'Go north' }, { label: 'Go south' }] })
      })

      await user.click(screen.getByRole('button', { name: 'Go north' }))

      expect(narrativeHistoryState.setChosenAction).toHaveBeenCalledWith(0, 'Go north')
    })
  })
  ```
- **Why it fails**: After web-055's GREEN, `useNarrativeHistory` is not wired into the page — `setChosenAction` is never called, so `narrativeHistoryState.setChosenAction` remains uncalled and the assertion fails.

## GREEN
- **Smallest change**: Import `useNarrativeHistory` from `./hooks/useNarrativeHistory`. Destructure `{ beats, addBeat, setChosenAction }` from the hook. Import `BeatHistory` from `./components/BeatHistory`. Render `<BeatHistory beats={beats} />` inside the narrative panel (above `StreamingText`). In `handleChoice(label)`, before calling `dispatch({type:'start'})`, call `setChosenAction(beats.length - 1, label)` to record the action on the last beat. (`addBeat` is wired in web-057.)
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

---
id: web-055
slug: choices-cleared-on-choice-click
status: done
source: "item 5 — choices cleared immediately on choice click (before stream responds)"
covers: atomic
---

## Behavior
When the player clicks a choice button, the `ChoiceList` should disappear immediately — before the next stream response arrives. This is achieved by dispatching a `{ type: 'start' }` event through `useStreamState`'s `dispatch` before calling `start()`. The `start` action resets `choices` to `[]` in the reducer, hiding the `ChoiceList`.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from web-049.

  describe('NarrativePage', () => {
    it('clears choices immediately when a choice is clicked', async () => {
      const user = userEvent.setup()
      render(<NarrativePage />)

      // Inject choices
      act(() => {
        capturedOnEvent!({ type: 'choices', choices: [{ label: 'Option A' }, { label: 'Option B' }] })
      })
      expect(screen.getByRole('button', { name: 'Option A' })).toBeInTheDocument()

      // Click a choice
      await user.click(screen.getByRole('button', { name: 'Option A' }))

      // Choices must be gone immediately
      expect(screen.queryByRole('button', { name: 'Option A' })).not.toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: After web-053's GREEN, `handleChoice` is a stub `(_label) => {}` that does nothing — `dispatch` is never called, so `choices` stays non-empty in state and the `ChoiceList` remains rendered.

## GREEN
- **Smallest change**: Replace the stub `handleChoice` with a real implementation. Create a `startStream` helper that calls `dispatch({ type: 'start' })` first (clearing choices via the reducer) then calls `start(...)`. In `handleChoice(label)`, call `dispatch({ type: 'start' })` and then `start({ prompt: label })`. The `dispatch` function is already available from `useStreamState()`. The `{ type: 'start' }` action resets `choices` to `[]` synchronously in the React state, so the `ChoiceList` unmounts on the next render.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
Extract the pattern of `dispatch({type:'start'}) → start(...)` into a shared `startStream(body)` helper to avoid duplication with `handleSubmit`.

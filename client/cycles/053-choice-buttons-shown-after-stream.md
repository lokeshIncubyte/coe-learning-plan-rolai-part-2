---
id: cycle-053
slug: choice-buttons-shown-after-stream
status: done
source: "item 4 — ChoiceList visible when choices present"
covers: atomic
---

## Behavior
After the server sends a `choices` event, `useStreamState` populates the `choices` array. `NarrativePage` should render a `ChoiceList` component whenever `choices.length > 0`, presenting the player with action buttons to continue the story.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from cycle-049.

  describe('NarrativePage', () => {
    it('shows choice buttons after a choices event arrives', () => {
      render(<NarrativePage />)

      act(() => {
        capturedOnEvent!({ type: 'choices', choices: [{ label: 'Fight' }, { label: 'Flee' }] })
      })

      expect(screen.getByRole('button', { name: 'Fight' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Flee' })).toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: After cycle-052's GREEN, there is no `ChoiceList` rendered in `NarrativePage`, so no buttons labelled 'Fight' or 'Flee' exist in the DOM.

## GREEN
- **Smallest change**: Import `ChoiceList` from `./components/ChoiceList`. Inside the `data-testid="narrative-panel"` div (or directly below `StreamingText`), render `{choices.length > 0 && <ChoiceList choices={choices} onSelect={handleChoice} />}`. Add a stub `const handleChoice = (_label: string) => {}` for now — it will be wired in subsequent cycles. `choices` comes from `useStreamState()`.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

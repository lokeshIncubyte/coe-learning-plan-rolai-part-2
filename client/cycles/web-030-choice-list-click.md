---
id: web-030
slug: choice-list-click
status: done
exec: use /exec-cycle to execute this cycle
source: "ChoiceList component — clicking a button calls onSelect with that choice's label"
covers: happy-path
group: choice-list
skip-reason: >
  The click handler (onClick={() => onSelect(choice.label)}) is already present in the
  GREEN implementation from web-029. Adding these tests after web-029's GREEN commit
  produces no RED phase — the tests pass immediately on first run. Behavior is fully
  covered by web-029's implementation; no separate RED→GREEN→REFACTOR round trip is
  possible here without artificially splitting the component.
---

## Behavior
When a user clicks a choice button in `ChoiceList`, the `onSelect` callback is called with the `label` of the clicked choice as its argument.

## RED
- **Test file**: `app/narrative/__tests__/ChoiceList.test.tsx` (appended to the file created in web-029)
- **Note**: This describe block is appended to `ChoiceList.test.tsx` after web-029 creates it. Because web-029's GREEN already wires `onClick={() => onSelect(choice.label)}`, these tests pass immediately — there is no genuine RED state. See `skip-reason` in the front matter.
- **Assertion** (for reference / documentation):
  ```tsx
  // appended to app/narrative/__tests__/ChoiceList.test.tsx
  import userEvent from '@testing-library/user-event'

  describe('ChoiceList — click', () => {
    it('calls onSelect with the label when a button is clicked', async () => {
      const user = userEvent.setup()
      const onSelect = jest.fn()
      render(<ChoiceList choices={[{ label: 'Negotiate' }, { label: 'Flee' }]} onSelect={onSelect} />)

      await user.click(screen.getByRole('button', { name: 'Negotiate' }))

      expect(onSelect).toHaveBeenCalledTimes(1)
      expect(onSelect).toHaveBeenCalledWith('Negotiate')
    })

    it('calls onSelect with the correct label for each button', async () => {
      const user = userEvent.setup()
      const onSelect = jest.fn()
      render(<ChoiceList choices={[{ label: 'Fight' }, { label: 'Flee' }]} onSelect={onSelect} />)

      await user.click(screen.getByRole('button', { name: 'Flee' }))

      expect(onSelect).toHaveBeenCalledWith('Flee')
    })
  })
  ```
- **Why it fails**: N/A — does not genuinely fail. After web-029's GREEN commit, `ChoiceList.tsx` exists with the handler already wired. Adding these tests produces a GREEN result on the first run.

## GREEN
- **Smallest change**: None. The click handler is already implemented in web-029's GREEN. These tests are regression documentation, not a new behavioral increment.
- **Files touched**: `app/narrative/__tests__/ChoiceList.test.tsx` (describe block appended — but only after web-029 is complete)

## REFACTOR
none

---

> **Status: skip** — behavior covered by web-029. No `/exec-cycle` needed.

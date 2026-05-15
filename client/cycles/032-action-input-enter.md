---
id: cycle-032
slug: action-input-enter
status: pending
exec: use /exec-cycle to execute this cycle
source: "ActionInput component — pressing Enter in the text input triggers onSubmit with trimmed value and clears the field"
covers: happy-path
group: action-input
---

## Behavior
When the user presses the Enter key inside the `ActionInput` text field, `onSubmit` is called with the trimmed input value and the field is cleared — identical behaviour to clicking the submit button.

## RED
- **Test file**: `app/narrative/__tests__/ActionInput.test.tsx` *(file already exists from cycle-031 — do not recreate it)*
- **Assertion**: Append the following `it()` block inside the existing `describe('ActionInput', () => { … })` block. **Do not add new imports** — `render`, `screen`, `userEvent`, and `ActionInput` are already imported at the top of the file.
  ```tsx
  it('calls onSubmit and clears field when Enter is pressed', async () => {
    const user = userEvent.setup()
    const onSubmit = jest.fn()
    render(<ActionInput onSubmit={onSubmit} disabled={false} />)

    await user.type(screen.getByRole('textbox'), 'flee the dungeon{Enter}')

    expect(onSubmit).toHaveBeenCalledWith('flee the dungeon')
    expect(screen.getByRole('textbox')).toHaveValue('')
  })
  ```
- **Why it fails**: `ActionInput.tsx` from cycle-031 renders the `<input>` with no `onKeyDown` handler. `userEvent.type` with `{Enter}` fires a `keydown` event on the input element, but since the input is inside a plain `<div>` (not a `<form>`), no submit occurs — `handleSubmit` is never called, so `onSubmit` is not invoked.

## GREEN
- **Smallest change**: Add `onKeyDown` to the `<input>` in `ActionInput.tsx`:
  ```tsx
  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
  ```
- **Files touched**: `app/narrative/components/ActionInput.tsx`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

---
id: web-029
slug: choice-list-render
status: done
exec: use /exec-cycle to execute this cycle
source: "ChoiceList component — renders a button per choice; empty array renders nothing; new choices prop replaces old buttons; clicking a button calls onSelect with that choice's label"
covers: happy-path
group: choice-list
---

## Behavior
`ChoiceList` accepts `choices: { label: string }[]` and `onSelect: (label: string) => void` props. It renders one `<button>` per choice displaying its label. When `choices` is empty, no buttons are rendered. When the `choices` prop changes (new beat), the new buttons replace the old ones. Clicking a button calls `onSelect` with the `label` of the clicked choice.

> **Note**: Click behavior is included here (not in a separate cycle) because the `onClick` handler and the render structure are a single atomic unit — there is no intermediate state where the component renders correctly but the handler is unwired. Cycle-030 is marked `skip` for this reason.

## RED
- **Test file**: `app/narrative/__tests__/ChoiceList.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { ChoiceList } from '../components/ChoiceList'

  describe('ChoiceList', () => {
    it('renders a button for each choice', () => {
      render(<ChoiceList choices={[{ label: 'Fight' }, { label: 'Flee' }]} onSelect={jest.fn()} />)
      expect(screen.getByRole('button', { name: 'Fight' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Flee' })).toBeInTheDocument()
    })

    it('renders nothing when choices is empty', () => {
      const { container } = render(<ChoiceList choices={[]} onSelect={jest.fn()} />)
      expect(container.querySelectorAll('button')).toHaveLength(0)
    })

    it('replaces buttons when choices prop changes', () => {
      const { rerender } = render(
        <ChoiceList choices={[{ label: 'Fight' }]} onSelect={jest.fn()} />
      )
      expect(screen.getByRole('button', { name: 'Fight' })).toBeInTheDocument()

      rerender(<ChoiceList choices={[{ label: 'Negotiate' }]} onSelect={jest.fn()} />)
      expect(screen.queryByRole('button', { name: 'Fight' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Negotiate' })).toBeInTheDocument()
    })

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
- **Why it fails**: `app/narrative/components/ChoiceList.tsx` does not exist — the import throws a module-not-found error, failing all tests in the file.

## GREEN
- **Smallest change**: Create `app/narrative/components/ChoiceList.tsx`:
  ```tsx
  export function ChoiceList({
    choices,
    onSelect,
  }: {
    choices: { label: string }[]
    onSelect: (label: string) => void
  }) {
    return (
      <div>
        {choices.map((choice) => (
          <button key={choice.label} onClick={() => onSelect(choice.label)}>
            {choice.label}
          </button>
        ))}
      </div>
    )
  }
  ```
- **Files touched**: `app/narrative/components/ChoiceList.tsx`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

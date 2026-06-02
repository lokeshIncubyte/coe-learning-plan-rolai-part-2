---
id: web-031
slug: action-input-click
status: done
exec: use /exec-cycle to execute this cycle
source: "ActionInput component — renders text input and submit button; click submits trimmed value and clears field; disabled prop disables both elements"
covers: happy-path
group: action-input
---

## Behavior
`ActionInput` accepts `onSubmit: (text: string) => void` and `disabled: boolean` props. It renders a text input and a submit button. Clicking the button calls `onSubmit` with the trimmed input value and clears the field. When `disabled` is `true`, both the input and button are disabled.

## RED
- **Test file**: `app/narrative/__tests__/ActionInput.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { ActionInput } from '../components/ActionInput'

  describe('ActionInput', () => {
    it('renders a text input and submit button', () => {
      render(<ActionInput onSubmit={jest.fn()} disabled={false} />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument()
    })

    it('calls onSubmit with trimmed value and clears field on button click', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      render(<ActionInput onSubmit={onSubmit} disabled={false} />)

      await user.type(screen.getByRole('textbox'), '  attack the guard  ')
      await user.click(screen.getByRole('button', { name: /submit/i }))

      expect(onSubmit).toHaveBeenCalledWith('attack the guard')
      expect(screen.getByRole('textbox')).toHaveValue('')
    })

    it('disables input and button when disabled is true', () => {
      render(<ActionInput onSubmit={jest.fn()} disabled={true} />)
      expect(screen.getByRole('textbox')).toBeDisabled()
      expect(screen.getByRole('button', { name: /submit/i })).toBeDisabled()
    })

    it('does not call onSubmit when input is blank', async () => {
      const user = userEvent.setup()
      const onSubmit = jest.fn()
      render(<ActionInput onSubmit={onSubmit} disabled={false} />)

      await user.click(screen.getByRole('button', { name: /submit/i }))

      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
  ```
- **Why it fails**: `app/narrative/components/ActionInput.tsx` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/components/ActionInput.tsx`:
  ```tsx
  'use client'

  import { useState } from 'react'

  export function ActionInput({
    onSubmit,
    disabled,
  }: {
    onSubmit: (text: string) => void
    disabled: boolean
  }) {
    const [value, setValue] = useState('')

    const handleSubmit = () => {
      if (!value.trim()) return
      onSubmit(value.trim())
      setValue('')
    }

    return (
      <div>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
        />
        <button onClick={handleSubmit} disabled={disabled}>
          Submit
        </button>
      </div>
    )
  }
  ```
- **Files touched**: `app/narrative/components/ActionInput.tsx`

## REFACTOR
none

---

> **Execute:** Run the `/exec-cycle` skill to execute this cycle (RED → GREEN → squash merge).

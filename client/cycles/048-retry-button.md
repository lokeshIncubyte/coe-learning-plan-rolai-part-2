---
id: cycle-048
slug: retry-button
status: done
exec: use /exec-cycle to execute this cycle
source: "RetryButton component — renders a 'Retry' button that calls onRetry prop when clicked"
covers: happy-path
---

## Behavior
`RetryButton` is a component exported from `app/narrative/components/RetryButton.tsx`. It accepts an `onRetry: () => void` prop. It renders a single `<button>` with the text "Retry". Clicking the button calls `onRetry`. The page mounts/unmounts `RetryButton` conditionally when `status === 'error'` — that orchestration lives in the page, not the component.

> **Note**: Click behavior is included here (not in a separate cycle) because the `onClick` handler and the render structure are a single atomic unit — `<button onClick={onRetry}>Retry</button>` is one expression. There is no intermediate state where the button renders correctly but the handler is unwired, so no genuine RED phase is possible for a click-only cycle.

## RED
- **Test file**: `app/narrative/__tests__/RetryButton.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { RetryButton } from '../components/RetryButton'

  describe('RetryButton', () => {
    it('renders a button with text "Retry"', () => {
      render(<RetryButton onRetry={jest.fn()} />)
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
    })

    it('calls onRetry when the button is clicked', async () => {
      const user = userEvent.setup()
      const onRetry = jest.fn()
      render(<RetryButton onRetry={onRetry} />)
      await user.click(screen.getByRole('button', { name: 'Retry' }))
      expect(onRetry).toHaveBeenCalledTimes(1)
    })
  })
  ```
- **Why it fails**: `app/narrative/components/RetryButton.tsx` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/components/RetryButton.tsx`:
  ```tsx
  export function RetryButton({ onRetry }: { onRetry: () => void }) {
    return <button onClick={onRetry}>Retry</button>
  }
  ```
- **Files touched**: `app/narrative/components/RetryButton.tsx`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

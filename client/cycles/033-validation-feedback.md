---
id: cycle-033
slug: validation-feedback
status: done
exec: use /exec-cycle to execute this cycle
source: "ValidationFeedback component — renders nothing when status is null; renders reason text with color indicator per status"
covers: happy-path
---

## Behavior
`ValidationFeedback` accepts `status: 'accepted' | 'modified' | 'rejected' | null` and `reason: string` props. When `status` is `null`, nothing is rendered. When a status is set, the `reason` text is rendered alongside a `data-testid="feedback-indicator"` element whose `data-status` attribute equals the status value.

## RED
- **Test file**: `app/narrative/__tests__/ValidationFeedback.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import { ValidationFeedback } from '../components/ValidationFeedback'

  describe('ValidationFeedback', () => {
    it('renders nothing when status is null', () => {
      const { container } = render(<ValidationFeedback status={null} reason="" />)
      expect(container.firstChild).toBeNull()
    })

    it('renders the reason text when status is accepted', () => {
      render(<ValidationFeedback status="accepted" reason="Good move." />)
      expect(screen.getByText('Good move.')).toBeInTheDocument()
      expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'accepted')
    })

    it('renders the reason text when status is modified', () => {
      render(<ValidationFeedback status="modified" reason="Slightly changed." />)
      expect(screen.getByText('Slightly changed.')).toBeInTheDocument()
      expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'modified')
    })

    it('renders the reason text when status is rejected', () => {
      render(<ValidationFeedback status="rejected" reason="Cannot phase through walls." />)
      expect(screen.getByText('Cannot phase through walls.')).toBeInTheDocument()
      expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'rejected')
    })
  })
  ```
- **Why it fails**: `app/narrative/components/ValidationFeedback.tsx` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/components/ValidationFeedback.tsx`:
  ```tsx
  const statusStyles: Record<string, string> = {
    accepted: 'text-green-600',
    modified: 'text-orange-500',
    rejected: 'text-red-600',
  }

  export function ValidationFeedback({
    status,
    reason,
  }: {
    status: 'accepted' | 'modified' | 'rejected' | null
    reason: string
  }) {
    if (!status) return null

    return (
      <div data-testid="feedback-indicator" data-status={status} className={statusStyles[status]}>
        {reason}
      </div>
    )
  }
  ```
- **Files touched**: `app/narrative/components/ValidationFeedback.tsx`

## REFACTOR
none

---

> **Execute:** Run the `/exec-cycle` skill to execute this cycle (RED → GREEN → squash merge).

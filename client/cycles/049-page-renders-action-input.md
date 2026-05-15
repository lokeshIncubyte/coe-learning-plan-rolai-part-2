---
id: cycle-049
slug: page-renders-action-input
status: done
source: "item 1 — render ActionInput always visible"
covers: atomic
---

## Behavior
`NarrativePage` should always render an `ActionInput` component inside the `data-testid="input-area"` div so the user can type and submit a prompt. The input must be present on initial mount regardless of stream state.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  import { render, screen, waitFor } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { act } from 'react'
  import NarrativePage from '../page'

  // --- Module-level mock state (shared across all page tests) ---
  let capturedOnEvent: ((event: { type: string; [key: string]: unknown }) => void) | null = null
  const mockStart = jest.fn()
  let mockIsStreaming = false

  jest.mock('../hooks/useStream', () => ({
    useStream: (_url: string, onEvent: (event: { type: string; [key: string]: unknown }) => void) => {
      capturedOnEvent = onEvent
      return { start: mockStart, isStreaming: mockIsStreaming }
    },
  }))

  jest.mock('../hooks/useScrollToBottom', () => ({
    useScrollToBottom: () => ({ current: null }),
  }))

  // Default fetch mock: non-ok response → skip validation, proceed to stream
  global.fetch = jest.fn(() => Promise.resolve({ ok: false })) as jest.Mock

  describe('NarrativePage', () => {
    beforeEach(() => {
      jest.clearAllMocks()
      mockIsStreaming = false
      capturedOnEvent = null
    })

    it('renders an ActionInput (text input) on initial mount', () => {
      render(<NarrativePage />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: The skeleton `NarrativePage` renders only two empty `div` elements — there is no `ActionInput` or `<input>` element, so `getByRole('textbox')` throws.

## GREEN
- **Smallest change**: Import `ActionInput` from `./components/ActionInput` and render it inside the `data-testid="input-area"` div with stub props: `<ActionInput onSubmit={()=>{}} disabled={false} />`.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

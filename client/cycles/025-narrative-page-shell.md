---
id: cycle-025
slug: narrative-page-shell
status: pending
exec: use /exec-cycle to execute this cycle
source: "Create narrative page at app/narrative/page.tsx — Client Component shell with fixed-height flex layout, scrollable panel placeholder, and bottom input area placeholder"
covers: happy-path
---

## Behavior
`app/narrative/page.tsx` exists as a `'use client'` component. It renders a full-viewport flex column layout: a scrollable narrative panel area (identified by `data-testid="narrative-panel"`) that grows to fill available space, and a bottom input area (identified by `data-testid="input-area"`) that stays fixed at the bottom.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import NarrativePage from '../page'

  describe('NarrativePage', () => {
    it('renders narrative panel and input area', () => {
      render(<NarrativePage />)
      expect(screen.getByTestId('narrative-panel')).toBeInTheDocument()
      expect(screen.getByTestId('input-area')).toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: `app/narrative/page.tsx` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/page.tsx`:
  ```tsx
  'use client'

  export default function NarrativePage() {
    return (
      <div className="flex flex-col h-dvh overflow-hidden">
        <div data-testid="narrative-panel" className="flex-1 min-h-0 overflow-y-auto" />
        <div data-testid="input-area" className="flex-shrink-0" />
      </div>
    )
  }
  ```
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

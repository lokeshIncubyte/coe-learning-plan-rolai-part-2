---
id: cycle-026
slug: narrative-panel
status: done
exec: use /exec-cycle to execute this cycle
source: "Build NarrativePanel component — renders a scrollable div containing a list of narrative beat strings passed as props; each beat is a <p> element"
covers: happy-path
---

## Behavior
`NarrativePanel` accepts a `beats: string[]` prop and renders each beat as a `<p>` element inside a scrollable container. With an empty array, nothing is rendered inside the container.

## RED
- **Test file**: `app/narrative/__tests__/NarrativePanel.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import { NarrativePanel } from '../components/NarrativePanel'

  describe('NarrativePanel', () => {
    it('renders each beat as a paragraph', () => {
      render(<NarrativePanel beats={['Once upon a time', 'The hero arose']} />)
      expect(screen.getByText('Once upon a time')).toBeInTheDocument()
      expect(screen.getByText('The hero arose')).toBeInTheDocument()
    })

    it('renders nothing inside container when beats is empty', () => {
      const { container } = render(<NarrativePanel beats={[]} />)
      expect(container.querySelectorAll('p')).toHaveLength(0)
    })
  })
  ```
- **Why it fails**: `app/narrative/components/NarrativePanel.tsx` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/components/NarrativePanel.tsx`:
  ```tsx
  export function NarrativePanel({ beats }: { beats: string[] }) {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {beats.map((beat, i) => (
          <p key={i} className="mb-4">{beat}</p>
        ))}
      </div>
    )
  }
  ```
- **Files touched**: `app/narrative/components/NarrativePanel.tsx`

## REFACTOR
none

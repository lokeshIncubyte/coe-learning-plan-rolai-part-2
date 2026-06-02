---
id: web-037
slug: beat-history
status: done
exec: use /exec-cycle to execute this cycle
source: "BeatHistory component — renders each beat's narrative; renders highlighted chosenAction below narrative when non-null"
covers: happy-path
---

## Behavior
`BeatHistory` accepts `beats: { narrative: string; chosenAction: string | null }[]`. It renders each beat's narrative text. When a beat has a non-null `chosenAction`, a `data-testid="chosen-action"` element containing the action text is rendered below that beat's narrative. Beats with `chosenAction: null` render no such element.

## RED
- **Test file**: `app/narrative/__tests__/BeatHistory.test.tsx`
- **Assertion**:
  ```tsx
  import { render, screen } from '@testing-library/react'
  import { BeatHistory } from '../components/BeatHistory'

  describe('BeatHistory', () => {
    it('renders each beat narrative', () => {
      render(
        <BeatHistory
          beats={[
            { narrative: 'The hero entered the cave.', chosenAction: null },
            { narrative: 'A dragon appeared.', chosenAction: null },
          ]}
        />
      )
      expect(screen.getByText('The hero entered the cave.')).toBeInTheDocument()
      expect(screen.getByText('A dragon appeared.')).toBeInTheDocument()
    })

    it('renders chosen-action element when chosenAction is set', () => {
      render(
        <BeatHistory
          beats={[{ narrative: 'The hero entered.', chosenAction: 'Attack the dragon' }]}
        />
      )
      expect(screen.getByTestId('chosen-action')).toHaveTextContent('Attack the dragon')
    })

    it('does not render chosen-action element when chosenAction is null', () => {
      render(
        <BeatHistory
          beats={[{ narrative: 'The hero entered.', chosenAction: null }]}
        />
      )
      expect(screen.queryByTestId('chosen-action')).not.toBeInTheDocument()
    })

    it('renders chosen-action only for beats that have one', () => {
      render(
        <BeatHistory
          beats={[
            { narrative: 'Beat one.', chosenAction: 'Flee' },
            { narrative: 'Beat two.', chosenAction: null },
          ]}
        />
      )
      expect(screen.getAllByTestId('chosen-action')).toHaveLength(1)
      expect(screen.getByTestId('chosen-action')).toHaveTextContent('Flee')
    })
  })
  ```
- **Why it fails**: `app/narrative/components/BeatHistory.tsx` does not exist — the import throws a module-not-found error.

## GREEN
- **Smallest change**: Create `app/narrative/components/BeatHistory.tsx`:
  ```tsx
  export type Beat = { narrative: string; chosenAction: string | null }

  export function BeatHistory({ beats }: { beats: Beat[] }) {
    return (
      <div>
        {beats.map((beat, i) => (
          <div key={i}>
            <p>{beat.narrative}</p>
            {beat.chosenAction && (
              <p data-testid="chosen-action" className="font-semibold text-indigo-600">
                {beat.chosenAction}
              </p>
            )}
          </div>
        ))}
      </div>
    )
  }
  ```
- **Files touched**: `app/narrative/components/BeatHistory.tsx`

## REFACTOR
none

---

> **Execute:** Run the `/exec-cycle` skill to execute this cycle (RED → GREEN → squash merge).

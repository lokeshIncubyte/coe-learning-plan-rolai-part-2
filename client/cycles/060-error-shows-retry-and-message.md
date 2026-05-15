---
id: cycle-060
slug: error-shows-retry-and-message
status: done
source: "item 8 — status=error shows RetryButton + errorMessage"
covers: atomic
---

## Behavior
When the stream emits an `error` event, `useStreamState` sets `status` to `'error'` and stores the `errorMessage`. `NarrativePage` should respond by rendering both the error message text and a `RetryButton` so the user knows something went wrong and can attempt recovery without reloading the page.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from cycle-049.

  describe('NarrativePage', () => {
    it('shows error message and Retry button after an error event', () => {
      render(<NarrativePage />)

      act(() => {
        capturedOnEvent!({ type: 'error', message: 'Connection lost' })
      })

      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
      expect(screen.getByText('Connection lost')).toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: After cycle-059's GREEN, there is no error UI in `NarrativePage`. The `error` event updates `useStreamState` (`status='error'`, `errorMessage='Connection lost'`) but nothing is conditionally rendered based on `status === 'error'`, so neither the Retry button nor the error message appears.

## GREEN
- **Smallest change**: Import `RetryButton` from `./components/RetryButton`. Inside the `data-testid="narrative-panel"` div, add:
  ```tsx
  {status === 'error' && (
    <>
      <p>{errorMessage}</p>
      <RetryButton onRetry={handleRetry} />
    </>
  )}
  ```
  Add a stub `const handleRetry = () => {}` for now — it will be wired in cycle-061. `status` and `errorMessage` are already available from `useStreamState()`.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

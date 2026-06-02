---
id: web-061
slug: retry-calls-start-with-last-prompt
status: done
source: "item 8 — clicking Retry calls start() with the last used prompt"
covers: atomic
---

## Behavior
When the player clicks the Retry button after a stream error, `NarrativePage` should re-attempt the last submitted prompt by calling `start({ prompt: lastPrompt })`. The last prompt is stored in a ref so it persists across re-renders without causing unnecessary re-renders itself. This gives users a one-click recovery path without having to retype their action.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from web-049.

  describe('NarrativePage', () => {
    it('calls start with the last prompt when Retry is clicked', async () => {
      const user = userEvent.setup()
      render(<NarrativePage />)

      // Submit a prompt (fetch returns non-ok by default → no validation, goes to start)
      await user.type(screen.getByRole('textbox'), 'hello')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      // Simulate a stream error
      act(() => {
        capturedOnEvent!({ type: 'error', message: 'Network failure' })
      })

      // The Retry button should now be visible
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()

      // Clear mock call count from the initial submit
      mockStart.mockClear()

      // Click Retry
      await user.click(screen.getByRole('button', { name: 'Retry' }))

      expect(mockStart).toHaveBeenLastCalledWith({ prompt: 'hello' })
    })
  })
  ```
- **Why it fails**: After web-060's GREEN, `handleRetry` is a stub `() => {}` that does nothing — clicking Retry does not call `mockStart` at all, so the assertion fails.

## GREEN
- **Smallest change**: Add `const lastPromptRef = useRef<string>('')`. In `handleSubmit(text)`, set `lastPromptRef.current = text` before doing anything else (before the fetch call). Replace the stub `handleRetry` with: `const handleRetry = () => { start({ prompt: lastPromptRef.current }) }`. Now clicking Retry replays the last prompt through the stream without validation.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

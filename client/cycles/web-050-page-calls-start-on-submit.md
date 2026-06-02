---
id: web-050
slug: page-calls-start-on-submit
status: done
source: "item 2 — stream on submit calls start({ prompt })"
covers: atomic
---

## Behavior
When the user types text into the `ActionInput` and clicks Submit, `NarrativePage` should call the `start` function returned by `useStream` with the object `{ prompt: text }`. This wires the input to the streaming hook so user input triggers the SSE stream.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from web-049.

  describe('NarrativePage', () => {
    it('calls start({ prompt }) when the user submits text', async () => {
      const user = userEvent.setup()
      render(<NarrativePage />)
      await user.type(screen.getByRole('textbox'), 'hello')
      await user.click(screen.getByRole('button', { name: 'Submit' }))
      expect(mockStart).toHaveBeenCalledWith({ prompt: 'hello' })
    })
  })
  ```
- **Why it fails**: After web-049's GREEN, `ActionInput` is rendered with `onSubmit={()=>{}}` — a no-op. `mockStart` is never called, so the assertion fails.

## GREEN
- **Smallest change**: In `page.tsx`, import `useStream` and `useStreamState`. Call `useStream('/api/stream', dispatch)` to obtain `{ start, isStreaming }`. Add a `handleSubmit` async function that calls `start({ prompt: text })`. Pass `handleSubmit` as the `onSubmit` prop on `ActionInput`. The global fetch default returns `{ ok: false }` in tests, so validation is skipped and `start` is reached directly.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

---
id: web-054
slug: input-disabled-while-streaming
status: done
source: "item 1 — disabled prop wired to isStreaming"
covers: atomic
---

## Behavior
While the SSE stream is active, the user should not be able to type a new prompt. The `ActionInput`'s `disabled` prop must reflect the live `isStreaming` value from `useStream` so that the input and submit button become disabled during streaming and re-enable once the stream ends.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from web-049.

  describe('NarrativePage', () => {
    it('disables the text input while isStreaming is true', () => {
      mockIsStreaming = true
      render(<NarrativePage />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })
  ```
- **Why it fails**: After web-053's GREEN, `ActionInput` is rendered with `disabled={false}` hardcoded (or wired to `isStreaming` from web-050 but the mock returns `false` by default). When `mockIsStreaming = true`, the mock returns `isStreaming: true`, but the prop is still hardcoded `false` if not yet wired — so the textbox is enabled and the assertion fails.

## GREEN
- **Smallest change**: Change the `disabled` prop on `<ActionInput>` from the hardcoded `false` to `disabled={isStreaming}`, where `isStreaming` is the value destructured from `useStream(...)`. No other changes needed.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

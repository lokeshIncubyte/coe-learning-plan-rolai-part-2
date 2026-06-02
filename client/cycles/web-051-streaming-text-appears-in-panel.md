---
id: web-051
slug: streaming-text-appears-in-panel
status: done
source: "item 2 — chunk content visible in narrative-panel"
covers: atomic
---

## Behavior
While the stream is active, incoming `chunk` events should accumulate in `narrativeText` (via `useStreamState`) and be displayed inside the `data-testid="narrative-panel"` div using the `StreamingText` component. The user sees the story appear word-by-word as chunks arrive.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from web-049.

  describe('NarrativePage', () => {
    it('displays chunk content in the narrative panel during streaming', () => {
      render(<NarrativePage />)

      act(() => {
        capturedOnEvent!({ type: 'start' })
      })
      act(() => {
        capturedOnEvent!({ type: 'chunk', content: 'hello world' })
      })

      expect(screen.getByTestId('narrative-panel')).toHaveTextContent('hello world')
    })
  })
  ```
- **Why it fails**: After web-050's GREEN, `StreamingText` is not rendered inside the narrative panel, so the panel has no text content and the assertion fails.

## GREEN
- **Smallest change**: Import `StreamingText` from `./components/StreamingText`. Inside the `data-testid="narrative-panel"` div, render `<StreamingText text={narrativeText} isStreaming={isStreaming} />` unconditionally (gating is added in web-052). `narrativeText` and `isStreaming` come from `useStreamState` and `useStream` respectively.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

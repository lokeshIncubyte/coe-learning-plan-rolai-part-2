---
id: web-052
slug: streaming-text-hidden-after-done
status: done
source: "item 3 — cursor gone after done event"
covers: atomic
---

## Behavior
Once the stream emits a `done` event, `status` transitions from `'streaming'` to `'done'`. At that point `StreamingText` (and its blinking cursor) should no longer be rendered — the narrative has been committed to beat history. Rendering `StreamingText` only when `status === 'streaming'` enforces this invariant.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from web-049.

  describe('NarrativePage', () => {
    it('hides the streaming cursor after the done event', () => {
      mockIsStreaming = true  // simulate active stream before render
      render(<NarrativePage />)

      // cursor visible while streaming (isStreaming=true from mock)
      expect(screen.getByTestId('cursor')).toBeInTheDocument()

      act(() => { capturedOnEvent!({ type: 'done' }) })

      // Without status==='streaming' gate, StreamingText stays mounted with
      // isStreaming=true (mockIsStreaming still true) → cursor remains → test fails
      expect(screen.queryByTestId('cursor')).not.toBeInTheDocument()
    })
  })
  ```
- **Why it fails**: After web-051's GREEN, `StreamingText` is rendered unconditionally. When `mockIsStreaming = true` and the `done` event fires, `useStreamState` moves `status` to `'done'` but `mockIsStreaming` is still `true`, so `StreamingText` re-renders with `isStreaming={true}` and the cursor stays in the DOM.

## GREEN
- **Smallest change**: Wrap the `<StreamingText>` render inside `{status === 'streaming' && <StreamingText text={narrativeText} isStreaming={isStreaming} />}`. The `status` field comes from `useStreamState()`.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

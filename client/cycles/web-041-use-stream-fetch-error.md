---
id: web-041
slug: use-stream-fetch-error
status: done
exec: use /exec-cycle to execute this cycle
source: "useStream error path — when fetch throws, onEvent called with { type: 'error', message } and isStreaming resets to false"
covers: error-path
group: use-stream
---

## Behavior
When `fetch` throws (e.g. network failure), `useStream` catches the error, dispatches `{ type: 'error', message: err.message }` to `onEvent`, and resets `isStreaming` to `false`.

## RED
- **Test file**: `app/narrative/__tests__/useStream.test.tsx` (append a new `describe` block — do NOT recreate the file). The file will contain 3 `describe` blocks after this append.
- **Assertion**:
  ```tsx
  // Append below the existing describe blocks in useStream.test.tsx

  describe('useStream — fetch error', () => {
    it('calls onEvent with error event and resets isStreaming when fetch rejects', async () => {
      const onEvent = jest.fn()
      global.fetch = jest.fn().mockRejectedValue(new Error('Network failure'))

      const { result } = renderHook(() => useStream('http://test', onEvent))

      await act(async () => {
        await result.current.start({})
      })

      expect(onEvent).toHaveBeenCalledWith({ type: 'error', message: 'Network failure' })
      expect(result.current.isStreaming).toBe(false)
    })
  })
  ```
- **Why it fails**: GREEN-040's `try/finally` has no `catch` block. When `fetch` rejects, the error escapes the `finally` and surfaces as an unhandled promise rejection — Jest fails the test with a rejection error, and `onEvent` is never called with an error event.

## GREEN
- **Smallest change**: Add a `catch` block between `try` and `finally` in `start()`:
  ```ts
  } catch (err) {
    onEvent({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  } finally {
  ```
- **Files touched**: `app/narrative/hooks/useStream.ts`

## REFACTOR
none

---

> **Execute:** Run `/exec-cycle` to execute this cycle (RED → GREEN → squash merge).

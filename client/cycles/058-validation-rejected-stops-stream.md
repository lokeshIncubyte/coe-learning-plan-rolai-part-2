---
id: cycle-058
slug: validation-rejected-stops-stream
status: done
source: "item 6 — POST /api/generate rejected:true → start never called"
covers: error-path
---

## Behavior
Before streaming begins, `NarrativePage` validates the user's prompt by sending a `POST /api/generate` request. If the response JSON contains `{ rejected: true }`, the submission is considered invalid and `start()` must NOT be called — the stream never opens. This prevents the narrative from advancing on blocked inputs.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from cycle-049.

  describe('NarrativePage', () => {
    it('does not call start when the validation endpoint rejects the prompt', async () => {
      const user = userEvent.setup()

      // Override fetch to return a rejection
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rejected: true, reason: 'Not allowed' }),
      })

      render(<NarrativePage />)
      await user.type(screen.getByRole('textbox'), 'bad input')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      await waitFor(() => {
        expect(mockStart).not.toHaveBeenCalled()
      })
    })
  })
  ```
- **Why it fails**: After cycle-057's GREEN, `handleSubmit` calls `start({ prompt: text })` unconditionally (the existing fetch in `useStream` itself is for the stream endpoint, not validation). There is no `POST /api/generate` validation call in `handleSubmit`, so `mockStart` is always called regardless of what `fetch` returns.

## GREEN
- **Smallest change**: At the top of `handleSubmit(text)`, add:
  ```ts
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: text }),
  })
  if (res.ok) {
    const data = await res.json()
    if (data.rejected) return  // early exit — do not stream
  }
  ```
  The default test mock returns `{ ok: false }`, so `res.ok` is `false` and the early-exit branch is never entered — all existing tests continue to pass. Only the per-test override returning `{ ok: true, json: ()=>({rejected:true,...}) }` triggers the early exit.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
none

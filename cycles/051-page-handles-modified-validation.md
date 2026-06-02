---
id: cycle-051
slug: page-handles-modified-validation
status: done
source: "modified validation status never set in UI — client side: page.tsx must set validationStatus='modified' and stream with modifiedAction"
covers: happy-path
group: generate-modified
---

## Dependencies

**(none — pure client logic cycle)** `ValidationFeedback` component already renders `data-status="modified"` (confirmed in `ValidationFeedback.tsx`).

## Behavior

`handleSubmit` in `client/app/narrative/page.tsx` currently ignores `modifiedAction` in the `/api/generate` response. After this cycle, when the response contains `modifiedAction`, the page sets `validationStatus = 'modified'` and calls `start({ prompt: data.modifiedAction })` instead of `start({ prompt: text })`. The `data-testid="feedback-indicator"` will show `data-status="modified"`. This is the last cycle in the `generate-modified` group. Integration smoke: POST `/api/generate` returning `{ modifiedAction: 'safe action' }` in a mock → the page shows `data-status="modified"` and `mockStart` is called with `{ prompt: 'safe action' }`.

## RED
- **Test file**: `client/app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  it('shows modified feedback and streams with modifiedAction when validator returns modified', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ narrative: 'ok', choices: [], modifiedAction: 'safe action' }),
    })
    render(<NarrativePage />)
    await user.type(screen.getByRole('textbox'), 'dangerous action')
    await user.click(screen.getByRole('button', { name: 'Submit' }))
    await waitFor(() => {
      expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'modified')
    })
    expect(mockStart).toHaveBeenCalledWith({ prompt: 'safe action' })
  })
  ```
- **Why it fails**: `handleSubmit` never sets `validationStatus = 'modified'` and always calls `start({ prompt: text })`, not `start({ prompt: data.modifiedAction })`.

## GREEN
- **Smallest change**: In `client/app/narrative/page.tsx`, modify `handleSubmit` to track an `effectivePrompt` and handle `modifiedAction`:
  ```ts
  const handleSubmit = async (text: string) => {
    lastPromptRef.current = text
    let effectivePrompt = text          // NEW
    setIsValidating(true)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.rejected) {
          setValidationStatus('rejected')
          setRejectionReason(data.reason ?? '')
          return
        }
        if (data.modifiedAction) {          // NEW
          setValidationStatus('modified')   // NEW
          effectivePrompt = data.modifiedAction  // NEW
        } else {
          setValidationStatus('accepted')
        }
      }
    } catch {
      // validation unavailable — proceed to stream
    } finally {
      setIsValidating(false)
    }
    start({ prompt: effectivePrompt })   // CHANGED from text to effectivePrompt
  }
  ```
- **Files touched**: `client/app/narrative/page.tsx`

## REFACTOR
none

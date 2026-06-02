---
id: web-059
slug: validation-accepted-shows-feedback
status: done
source: "items 6+7 — non-rejected response shows accepted feedback-indicator"
covers: happy-path
---

## Behavior
When the validation endpoint responds with `ok: true` and the payload does not have `rejected: true`, the user's action is considered accepted. `NarrativePage` should display a `ValidationFeedback` component with `status="accepted"` so the player gets immediate visual confirmation that their input was valid before the stream content arrives.

## RED
- **Test file**: `app/narrative/__tests__/page.test.tsx`
- **Assertion**:
  ```ts
  // Mock setup already in place from web-049.

  describe('NarrativePage', () => {
    it('shows accepted feedback indicator after a non-rejected validation response', async () => {
      const user = userEvent.setup()

      // Override fetch to return an accepted (non-rejected) response
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ narrative: 'ok', choices: [] }),
      })

      render(<NarrativePage />)
      await user.type(screen.getByRole('textbox'), 'go north')
      await user.click(screen.getByRole('button', { name: 'Submit' }))

      await waitFor(() => {
        expect(screen.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'accepted')
      })
    })
  })
  ```
- **Why it fails**: After web-058's GREEN, the page handles `rejected: true` but never sets any validation status state — `ValidationFeedback` is not rendered at all, so `data-testid="feedback-indicator"` does not exist in the DOM.

## GREEN
- **Smallest change**: Add two `useState` calls: `const [validationStatus, setValidationStatus] = useState<'accepted' | 'rejected' | null>(null)` and `const [rejectionReason, setRejectionReason] = useState('')`. In `handleSubmit`, after confirming `res.ok` and reading `data`: if `data.rejected`, call `setValidationStatus('rejected')` and `setRejectionReason(data.reason ?? '')` then return. Otherwise, call `setValidationStatus('accepted')`. Import `ValidationFeedback` from `./components/ValidationFeedback`. Render `<ValidationFeedback status={validationStatus} reason={rejectionReason} />` inside the input-area div (above `ActionInput`). When `validationStatus` is `null`, `ValidationFeedback` renders nothing — so the initial render and non-validation tests are unaffected.
- **Files touched**: `app/narrative/page.tsx`

## REFACTOR
Consider resetting `validationStatus` to `null` when a new stream `start` event fires so the indicator clears between rounds.

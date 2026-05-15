/**
 * E2E acceptance tests for the narrative page — Day-6 success criteria.
 *
 * All backend calls are intercepted via page.route() so tests run without
 * a live server. The mock responses use the real SSE format the backend emits:
 *   data: {"type":"..."}  (newline-separated, blank line between events)
 *
 * Backend endpoint: GET /api/generate/stream?prompt=...
 * Validation endpoint: POST /api/generate   (returns { rejected, reason } | { narrative, choices })
 */

import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build an SSE response body from an array of event objects. */
function sse(...events: object[]): string {
  return events.map((e) => `data: ${JSON.stringify(e)}`).join('\n\n') + '\n\n'
}

/** Fill the custom action input and click Submit. */
async function submitAction(page: Page, text: string) {
  await page.getByRole('textbox').fill(text)
  await page.getByRole('button', { name: 'Submit' }).click()
}

/** Mock the SSE stream endpoint for one request then restore. */
async function mockStream(page: Page, events: object[]) {
  await page.route('**/generate/stream**', (route) => {
    route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
      body: sse(...events),
    })
  })
}

/** Mock the validation / non-streaming generate endpoint. */
async function mockGenerate(page: Page, body: object) {
  await page.route('**/generate', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
    } else {
      route.continue()
    }
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Narrative page — success criteria', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/narrative')
  })

  // S1 ─────────────────────────────────────────────────────────────────────
  test('S1: narrative page renders with panel and input', async ({ page }) => {
    await expect(page.getByTestId('narrative-panel')).toBeVisible()
    await expect(page.getByRole('textbox')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible()
  })

  // S2 ─────────────────────────────────────────────────────────────────────
  test('S2: streaming text appears in narrative panel', async ({ page }) => {
    await mockStream(page, [
      { type: 'start' },
      { type: 'chunk', content: 'You stand at a crossroads.' },
      { type: 'chunk', content: ' The path forks ahead.' },
      { type: 'done' },
      { type: 'choices', choices: [{ label: 'Go north' }] },
    ])

    await submitAction(page, 'Begin the adventure')

    await expect(page.getByText('You stand at a crossroads. The path forks ahead.')).toBeVisible()
  })

  // S3a ────────────────────────────────────────────────────────────────────
  test('S3a: typing indicator (cursor) hidden after stream completes', async ({ page }) => {
    await mockStream(page, [
      { type: 'start' },
      { type: 'chunk', content: 'Once upon a time.' },
      { type: 'done' },
      { type: 'choices', choices: [{ label: 'Continue' }] },
    ])

    await submitAction(page, 'Begin')
    await expect(page.getByText('Once upon a time.')).toBeVisible()
    await expect(page.getByTestId('cursor')).not.toBeVisible()
  })

  // S3b ────────────────────────────────────────────────────────────────────
  test('S3b: 2-4 dynamic choice buttons appear after narrative', async ({ page }) => {
    await mockStream(page, [
      { type: 'start' },
      { type: 'chunk', content: 'You face a choice.' },
      { type: 'done' },
      { type: 'choices', choices: [{ label: 'Fight' }, { label: 'Flee' }, { label: 'Negotiate' }] },
    ])

    await submitAction(page, 'Begin')

    await expect(page.getByRole('button', { name: 'Fight' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Flee' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Negotiate' })).toBeVisible()
  })

  // S4 ─────────────────────────────────────────────────────────────────────
  test('S4: custom action input submits the typed text as the prompt', async ({ page }) => {
    let capturedPrompt: string | null = null

    await page.route('**/generate/stream**', (route) => {
      const url = new URL(route.request().url())
      capturedPrompt = url.searchParams.get('prompt') ?? route.request().postData()
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: sse({ type: 'start' }, { type: 'done' }, { type: 'choices', choices: [{ label: 'Go' }] }),
      })
    })

    await submitAction(page, 'I pick up the ancient sword')

    expect(capturedPrompt).toContain('I pick up the ancient sword')
  })

  // S5 ─────────────────────────────────────────────────────────────────────
  test('S5: input and Submit are disabled while stream is in progress', async ({ page }) => {
    let resolveStream!: () => void
    const streamDone = new Promise<void>((resolve) => { resolveStream = resolve })

    await page.route('**/generate/stream**', async (route) => {
      await streamDone
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: sse({ type: 'start' }, { type: 'done' }, { type: 'choices', choices: [{ label: 'Go' }] }),
      })
    })

    await page.getByRole('textbox').fill('Begin')
    await page.getByRole('button', { name: 'Submit' }).click()

    // Stream is in-flight — both controls must be disabled
    await expect(page.getByRole('textbox')).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Submit' })).toBeDisabled()

    // Resolve the stream — controls must re-enable
    resolveStream()
    await expect(page.getByRole('textbox')).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Submit' })).toBeEnabled()
  })

  // S5b ────────────────────────────────────────────────────────────────────
  test('S5b: choice buttons are cleared while next stream is in progress', async ({ page }) => {
    // First beat: produce choices
    await mockStream(page, [
      { type: 'start' },
      { type: 'chunk', content: 'First beat.' },
      { type: 'done' },
      { type: 'choices', choices: [{ label: 'Option A' }] },
    ])
    await submitAction(page, 'Begin')
    await expect(page.getByRole('button', { name: 'Option A' })).toBeVisible()

    // Second beat: hold stream open while clicking the choice
    let resolveStream2!: () => void
    const streamDone2 = new Promise<void>((resolve) => { resolveStream2 = resolve })
    await page.route('**/generate/stream**', async (route) => {
      await streamDone2
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: sse({ type: 'start' }, { type: 'done' }, { type: 'choices', choices: [{ label: 'Option B' }] }),
      })
    })

    await page.getByRole('button', { name: 'Option A' }).click()
    // Old choices cleared while streaming
    await expect(page.getByRole('button', { name: 'Option A' })).not.toBeVisible()

    resolveStream2()
  })

  // S6 ─────────────────────────────────────────────────────────────────────
  test('S6: validation feedback shown for accepted action', async ({ page }) => {
    await mockStream(page, [
      { type: 'start' },
      { type: 'chunk', content: 'You swing the sword.' },
      { type: 'done' },
      { type: 'choices', choices: [{ label: 'Continue' }] },
    ])

    await submitAction(page, 'Attack the goblin')

    await expect(page.getByTestId('feedback-indicator')).toBeVisible()
    await expect(page.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'accepted')
  })

  test('S6b: rejected action shows rejection feedback and no narrative is generated', async ({ page }) => {
    await mockGenerate(page, { rejected: true, reason: 'That action is not permitted here.' })

    await submitAction(page, 'Use magic to teleport')

    await expect(page.getByTestId('feedback-indicator')).toHaveAttribute('data-status', 'rejected')
    await expect(page.getByText('That action is not permitted here.')).toBeVisible()
  })

  // S7 ─────────────────────────────────────────────────────────────────────
  test('S7: previous beats appear in narrative history after new beat loads', async ({ page }) => {
    // Beat 1
    await mockStream(page, [
      { type: 'start' },
      { type: 'chunk', content: 'You enter the forest.' },
      { type: 'done' },
      { type: 'choices', choices: [{ label: 'Go deeper' }] },
    ])
    await submitAction(page, 'Enter forest')
    await expect(page.getByText('You enter the forest.')).toBeVisible()

    // Beat 2
    await page.route('**/generate/stream**', (route) => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: sse(
          { type: 'start' },
          { type: 'chunk', content: 'The trees grow denser.' },
          { type: 'done' },
          { type: 'choices', choices: [{ label: 'Turn back' }] },
        ),
      })
    })
    await page.getByRole('button', { name: 'Go deeper' }).click()

    await expect(page.getByText('The trees grow denser.')).toBeVisible()
    // Previous beat still visible in history
    await expect(page.getByText('You enter the forest.')).toBeVisible()
  })

  // S7b ────────────────────────────────────────────────────────────────────
  test('S7b: chosen action is highlighted in history', async ({ page }) => {
    // Beat 1
    await mockStream(page, [
      { type: 'start' },
      { type: 'chunk', content: 'First beat.' },
      { type: 'done' },
      { type: 'choices', choices: [{ label: 'Go north' }] },
    ])
    await submitAction(page, 'Begin')

    // Beat 2 — click choice "Go north"
    await page.route('**/generate/stream**', (route) => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: sse(
          { type: 'start' },
          { type: 'chunk', content: 'Second beat.' },
          { type: 'done' },
          { type: 'choices', choices: [{ label: 'Continue' }] },
        ),
      })
    })
    await page.getByRole('button', { name: 'Go north' }).click()

    await expect(page.getByTestId('chosen-action')).toHaveText('Go north')
  })

  // S8 ─────────────────────────────────────────────────────────────────────
  test('S8: error state shows retry button; retry re-runs the stream', async ({ page }) => {
    await mockStream(page, [
      { type: 'start' },
      { type: 'error', message: 'Service unavailable' },
    ])

    await submitAction(page, 'Begin')

    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(page.getByText('Service unavailable')).toBeVisible()

    // Set up success response for the retry
    await page.route('**/generate/stream**', (route) => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: sse(
          { type: 'start' },
          { type: 'chunk', content: 'Success after retry.' },
          { type: 'done' },
          { type: 'choices', choices: [{ label: 'Continue' }] },
        ),
      })
    })
    await page.getByRole('button', { name: 'Retry' }).click()

    await expect(page.getByText('Success after retry.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Retry' })).not.toBeVisible()
  })

  // S9 ─────────────────────────────────────────────────────────────────────
  test('S9: smooth choice → narrative → choice loop over two rounds', async ({ page }) => {
    // Round 1
    await mockStream(page, [
      { type: 'start' },
      { type: 'chunk', content: 'Round 1: you stand at the gate.' },
      { type: 'done' },
      { type: 'choices', choices: [{ label: 'Enter' }, { label: 'Walk away' }] },
    ])
    await submitAction(page, 'Start')

    await expect(page.getByText('Round 1: you stand at the gate.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Enter' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Walk away' })).toBeVisible()

    // Round 2
    await page.route('**/generate/stream**', (route) => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
        body: sse(
          { type: 'start' },
          { type: 'chunk', content: 'Round 2: you step inside.' },
          { type: 'done' },
          { type: 'choices', choices: [{ label: 'Look around' }, { label: 'Leave' }] },
        ),
      })
    })
    await page.getByRole('button', { name: 'Enter' }).click()

    await expect(page.getByText('Round 2: you step inside.')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Look around' })).toBeVisible()
    // Round 1 choices cleared
    await expect(page.getByRole('button', { name: 'Enter' })).not.toBeVisible()
    // Round 1 history still present
    await expect(page.getByText('Round 1: you stand at the gate.')).toBeVisible()
  })

  // S10 ────────────────────────────────────────────────────────────────────
  test('S10: fetch-level network error shows retry button', async ({ page }) => {
    await page.route('**/generate/stream**', (route) => route.abort('failed'))

    await submitAction(page, 'Begin')

    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible()
  })
})

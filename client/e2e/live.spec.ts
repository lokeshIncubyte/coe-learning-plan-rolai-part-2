/**
 * LIVE e2e suite — real server, real DB, real LLM.
 *
 * Rules:
 *   - NO page.route(). NO mocking. NO stubs. If you reach for one, you're in
 *     the wrong file — use e2e/narrative.spec.ts (mocked).
 *   - Assert STRUCTURE, not content. LLM output is non-deterministic; stable
 *     signals are: "panel has non-empty text", "cursor disappears", "2-4
 *     choice buttons exist", "history grew by one".
 *   - Be patient. A single auto-start beat can take 30s. waitForBeatComplete()
 *     centralises that wait so individual tests don't sprinkle bespoke timeouts.
 *   - Auth guard reads localStorage on mount → tokens must be in place BEFORE
 *     navigation to a guarded page (loginAs() or addInitScript).
 *
 * Run with:
 *   npx playwright test --config=playwright.live.config.ts
 *
 * Test IDs:
 *   L-G01..G05  guards & auth
 *   L-U01..U05  narrative real-generation user stories
 *   L-A01       admin stats
 */

import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

// ---------------------------------------------------------------------------
// Credentials (seeded via prisma seed — see server/prisma/seed.ts)
// ---------------------------------------------------------------------------

const USER = { email: 'user@platform.com', password: 'login' }
const ADMIN = { email: 'admin@platform.com', password: 'login' }

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Drive the real /login form end-to-end and wait for redirect.
 *
 * Uses the UI (not a direct fetch) so this exercises the same client-side
 * path a real user takes: form submit → POST /api/auth/login → token
 * persisted to localStorage → router.push('/narrative' | '/admin').
 *
 * Returns the JWT that ended up in localStorage.
 */
async function loginAs(
  page: Page,
  creds: { email: string; password: string },
  expectedLandingPath: '/narrative' | '/admin',
): Promise<string> {
  await page.goto('/login')
  await page.locator('#email').fill(creds.email)
  await page.locator('#password').fill(creds.password)
  await page.getByRole('button', { name: 'Sign In' }).click()

  await page.waitForURL(`**${expectedLandingPath}`, { timeout: 30_000 })

  const token = await page.evaluate(() => localStorage.getItem('accessToken'))
  expect(token, 'login should have persisted a JWT to localStorage').toBeTruthy()
  return token as string
}

/**
 * Obtain a JWT without touching the UI. Used by guard tests that need to
 * plant a known token via addInitScript before any page-mount logic runs.
 */
async function fetchToken(
  request: APIRequestContext,
  creds: { email: string; password: string },
): Promise<string> {
  const res = await request.post('http://localhost:3000/api/auth/login', {
    data: creds,
    headers: { 'Content-Type': 'application/json' },
  })
  expect(res.status(), 'auth/login must succeed for seeded credentials').toBe(200)
  const body = await res.json()
  expect(body.accessToken, 'auth/login response must contain accessToken').toBeTruthy()
  return body.accessToken as string
}

/**
 * Wait for an in-flight LLM beat to finish.
 *
 * Two-phase wait:
 *   1. Wait for streaming to START: input becomes disabled. This guards
 *      against the race where the page mounts but the auto-start useEffect
 *      hasn't fired yet — both cursor=0 and input=enabled are true before
 *      streaming begins, so checking only the end-state would return
 *      immediately on an empty panel.
 *   2. Wait for streaming to END: cursor disappears and input re-enables.
 *
 * The 15s start-window is generous — the auto-start useEffect fires right
 * after mount and the LLM call begins immediately.
 */
async function waitForBeatComplete(page: Page, timeout = 180_000): Promise<void> {
  // Phase 1: wait for streaming to begin (input goes disabled)
  await page.waitForSelector('[aria-label="Your action"]:disabled', { timeout: 15_000 })
  // Phase 2: wait for streaming to finish (cursor gone, input re-enabled)
  await expect(page.getByTestId('cursor')).toHaveCount(0, { timeout })
  await expect(page.getByLabel('Your action')).toBeEnabled({ timeout })
}

/**
 * Wait for at least one choice button to appear.
 * Uses data-testid="choice-button" (set on ChoiceList buttons) to avoid
 * matching the RetryButton or Submit, which also live inside narrative-panel.
 */
async function waitForChoices(page: Page, timeout = 90_000): Promise<void> {
  await expect(page.getByTestId('choice-button').first()).toBeVisible({ timeout })
}

/** Count how many choice buttons are currently rendered. */
async function countChoices(page: Page): Promise<number> {
  return page.getByTestId('choice-button').count()
}

/** Return the full text currently visible in the narrative panel (trimmed). */
async function readPanelText(page: Page): Promise<string> {
  return ((await page.getByTestId('narrative-panel').innerText()) ?? '').trim()
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

test.describe('LIVE — real server, real LLM', () => {
  // Clear localStorage before every test so a token from a previous test
  // never bleeds in. We navigate to /login first to acquire an origin
  // (localStorage is per-origin and unavailable on about:blank).
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  // =========================================================================
  // L-G01  USER login → /narrative, token persisted
  // =========================================================================
  test('L-G01: USER logs in with real credentials and lands on /narrative', async ({ page }) => {
    const token = await loginAs(page, USER, '/narrative')

    // Narrative panel must be visible — guards did not bounce us.
    await expect(page.getByTestId('narrative-panel')).toBeVisible()

    // JWT is 3 dot-separated segments. We don't decode; the redirect to
    // /narrative (not /admin) already proved role===USER.
    expect(token.split('.')).toHaveLength(3)
  })

  // =========================================================================
  // L-G02  ADMIN login → /admin, stats render with real values
  // =========================================================================
  test('L-G02: ADMIN logs in and stats panel renders with real values', async ({ page }) => {
    await loginAs(page, ADMIN, '/admin')

    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    // The page renders <p>Loading…</p> until /api/admin/stats resolves.
    // Wait for the <dl> (only appears post-fetch) before asserting fields.
    await expect(page.locator('dl')).toBeVisible({ timeout: 30_000 })

    for (const label of ['Entities', 'Edges', 'Sessions', 'History entries', 'Latest history']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible()
    }

    // No "Loading…" placeholder should remain after the dl is visible.
    await expect(page.getByText('Loading…')).toHaveCount(0)
  })

  // =========================================================================
  // L-G03  Wrong password → visible error, stay on /login
  // =========================================================================
  test('L-G03: wrong password shows an error and stays on /login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill(USER.email)
    await page.locator('#password').fill('definitely-not-the-password')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // p[role="alert"] avoids matching Next.js's built-in route announcer div.
    const alert = page.locator('p[role="alert"]')
    await expect(alert).toBeVisible()
    await expect(alert).toHaveText('Invalid email or password')

    expect(new URL(page.url()).pathname).toBe('/login')
    expect(await page.evaluate(() => localStorage.getItem('accessToken'))).toBeNull()
  })

  // =========================================================================
  // L-G04  No token → /narrative redirects to /login
  // =========================================================================
  test('L-G04: unauthenticated visit to /narrative redirects to /login', async ({ page }) => {
    // localStorage already cleared in beforeEach.
    await page.goto('/narrative')
    await page.waitForURL('**/login', { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toBe('/login')

    // narrative-panel must never have rendered — guard fired before mount.
    await expect(page.getByTestId('narrative-panel')).toHaveCount(0)
  })

  // =========================================================================
  // L-G05  USER token on /admin → /login
  // =========================================================================
  test('L-G05: USER token visiting /admin is bounced to /login', async ({ page, request }) => {
    // Obtain a real token via API (no UI) so we can plant it before navigation.
    const userToken = await fetchToken(request, USER)
    await page.addInitScript((t) => localStorage.setItem('accessToken', t), userToken)

    await page.goto('/admin')
    await page.waitForURL('**/login', { timeout: 10_000 })
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  // =========================================================================
  // L-U01  Auto-start fires → narrative streams in → cursor disappears
  // =========================================================================
  test('L-U01: auto-start populates the panel and cursor disappears when done', async ({ page }) => {
    await loginAs(page, USER, '/narrative')

    // Wait for the full beat: cursor gone + input enabled.
    await waitForBeatComplete(page)

    const text = await readPanelText(page)
    // Structural floor: at least 20 chars. The LLM occasionally returns a
    // short opener; 20 chars is a deliberately low bar that only catches
    // empty or near-empty responses.
    expect(text.length, `panel should contain narrative text, got: "${text.slice(0, 80)}"`).toBeGreaterThan(20)
  })

  // =========================================================================
  // L-U02  Auto-start produces 2-4 choice buttons
  // =========================================================================
  test('L-U02: after auto-start, 2-4 choice buttons are rendered', async ({ page }) => {
    await loginAs(page, USER, '/narrative')
    await waitForBeatComplete(page)
    await waitForChoices(page)

    const count = await countChoices(page)
    // The spec says 2-4 choices. A value outside this range is a regression:
    // 0-1 → likely a JSON-parse failure server-side;
    // 5+  → prompt regression in choice-generator.
    expect(count, `expected 2-4 choices, got ${count}`).toBeGreaterThanOrEqual(2)
    expect(count, `expected 2-4 choices, got ${count}`).toBeLessThanOrEqual(4)
  })

  // =========================================================================
  // L-U03  Click a choice → next beat streams → previous beat in history
  // =========================================================================
  test('L-U03: clicking a choice generates a new beat and moves the old one to history', async ({ page }) => {
    await loginAs(page, USER, '/narrative')
    await waitForBeatComplete(page)
    await waitForChoices(page)

    // Capture beat 1's text before clicking. After beat 2 completes this
    // text must still appear (moved into BeatHistory).
    const beatOneText = await readPanelText(page)
    expect(beatOneText.length).toBeGreaterThan(20)

    // Pick the first choice. We use .first() because we don't know the labels.
    const firstChoice = page.getByTestId('choice-button').first()
    const chosenLabel = (await firstChoice.innerText()).trim()
    await firstChoice.click()

    await waitForBeatComplete(page)
    await waitForChoices(page)

    // Beat 1 text must still be visible in history.
    // We fingerprint on the first 60 chars to avoid fragile exact-match.
    const fingerprint = beatOneText.slice(0, 60)
    await expect(
      page.getByTestId('narrative-panel').getByText(fingerprint, { exact: false }),
    ).toBeVisible()

    // The clicked choice should appear as the chosen-action badge for beat 1.
    await expect(page.getByTestId('chosen-action')).toHaveText(chosenLabel)
  })

  // =========================================================================
  // L-U04  Type a custom action → validation → stream → choices
  // =========================================================================
  test('L-U04: custom action submits, validates, streams a beat, and produces choices', async ({ page }) => {
    // Custom action = POST /api/generate (validate) + SSE /api/generate/stream (generate).
    // Two full LLM pipelines run sequentially: budget 10 minutes.
    test.setTimeout(600_000)
    await loginAs(page, USER, '/narrative')
    // Must wait for auto-start to finish — input is disabled while streaming.
    await waitForBeatComplete(page)
    await waitForChoices(page)

    // A benign, in-genre action the validator should accept.
    await page.getByLabel('Your action').fill('I light my torch and step forward cautiously')
    await page.getByRole('button', { name: 'Submit' }).click()

    // POST /api/generate (validate) + SSE stream each take ~90s → budget 300s for Phase 2.
    await waitForBeatComplete(page, 300_000)
    await waitForChoices(page)

    const count = await countChoices(page)
    expect(count).toBeGreaterThanOrEqual(2)
    expect(count).toBeLessThanOrEqual(4)

    // Feedback indicator must not be 'rejected'. Clean actions may come back
    // as 'accepted' or 'modified' depending on the validator LLM.
    const status = await page.getByTestId('feedback-indicator').getAttribute('data-status')
    expect(status, `expected accepted or modified, got "${status}"`).toMatch(/^(accepted|modified)$/)
  })

  // =========================================================================
  // L-U05  Two-round game loop: choice → beat → choice → beat (history grows)
  // =========================================================================
  test('L-U05: two consecutive choice rounds produce two history beats', async ({ page }) => {
    await loginAs(page, USER, '/narrative')

    // Round 0: auto-start beat
    await waitForBeatComplete(page)
    await waitForChoices(page)
    const round0Fingerprint = (await readPanelText(page)).slice(0, 60)

    // Round 1: click a choice
    await page.getByTestId('choice-button').first().click()
    await waitForBeatComplete(page)
    await waitForChoices(page)

    // After round 1, BeatHistory holds one card with a chosen-action badge.
    await expect(page.getByTestId('chosen-action')).toHaveCount(1)

    // Round 2: click another choice
    await page.getByTestId('choice-button').first().click()
    await waitForBeatComplete(page)
    await waitForChoices(page)

    // After round 2, both previous beats are historised → two badges.
    await expect(page.getByTestId('chosen-action')).toHaveCount(2)

    // Auto-start beat's text must still be visible in history.
    await expect(
      page.getByTestId('narrative-panel').getByText(round0Fingerprint, { exact: false }),
    ).toBeVisible()
  })

  // =========================================================================
  // L-A01  Admin stats — all five fields render with non-placeholder values
  // =========================================================================
  test('L-A01: ADMIN /admin renders all five stat fields with non-placeholder values', async ({ page }) => {
    await loginAs(page, ADMIN, '/admin')
    await expect(page.locator('dl')).toBeVisible({ timeout: 30_000 })

    for (const label of ['Entities', 'Edges', 'Sessions', 'History entries', 'Latest history']) {
      const dt = page.locator('dt', { hasText: new RegExp(`^${label}$`) })
      const dd = dt.locator('xpath=following-sibling::dd[1]')
      await expect(dd).toBeVisible()
      const value = (await dd.innerText()).trim()
      expect(value, `${label} should not be the loading placeholder`).not.toBe('Loading…')
      expect(value, `${label} should be populated`).not.toBe('')
    }
  })
})

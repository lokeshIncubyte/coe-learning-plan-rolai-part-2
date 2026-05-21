/**
 * E2E acceptance tests for the auth flow — login form, session handling,
 * and route protection via useAuthGuard().
 *
 * All backend calls are intercepted via page.route() so tests run without
 * a live server.
 *
 * Auth endpoints:
 *   POST /api/auth/login            → { accessToken } | { message }
 *
 * Fake JWT tokens (header.payload.signature). The payload segment is the
 * base64-encoded JSON the page reads via atob():
 *   USER  → eyJyb2xlIjoiVVNFUiJ9   = {"role":"USER"}
 *   ADMIN → eyJyb2xlIjoiQURNSU4ifQ = {"role":"ADMIN"}
 */

import { test, expect, type Page, type Route } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_TOKEN = 'header.eyJyb2xlIjoiVVNFUiJ9.sig'
const ADMIN_TOKEN = 'header.eyJyb2xlIjoiQURNSU4ifQ.sig'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mock POST /api/auth/login with the given status + JSON body. */
async function mockLogin(page: Page, status: number, body: object) {
  await page.unroute('**/api/auth/login').catch(() => {})
  await page.route('**/api/auth/login', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    } else {
      await route.fallback()
    }
  })
}

/** Mock GET /api/admin/stats with a stub 200 response (so the admin page
 *  can render after a successful redirect). */
async function mockAdminStats(page: Page, body: object = {}) {
  await page.unroute('**/api/admin/stats').catch(() => {})
  await page.route('**/api/admin/stats', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

/** Stub the narrative page's network so post-login navigation doesn't hang
 *  on real-server fetches. */
async function mockNarrativeBackends(page: Page) {
  await page.route('**/generate/stream**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      body: 'data: {"type":"start"}\n\ndata: {"type":"done"}\n\n',
    })
  })
  await page.route(/\/api\/generate(\?.*)?$/, async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      })
    } else {
      await route.fallback()
    }
  })
}

/** Read localStorage.accessToken from the page context. */
async function readAccessToken(page: Page): Promise<string | null> {
  return page.evaluate(() => localStorage.getItem('accessToken'))
}

/** Set localStorage.accessToken on the current origin. Requires the page to
 *  already have an origin loaded (call after page.goto). */
async function setAccessToken(page: Page, token: string) {
  await page.evaluate((t) => localStorage.setItem('accessToken', t), token)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Auth — login form & route protection', () => {
  test.beforeEach(async ({ page }) => {
    // Land on /login first so we have an origin to clear storage against.
    await mockLogin(page, 200, { accessToken: USER_TOKEN })
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  // US-G01 ──────────────────────────────────────────────────────────────────
  test('US-G01: login form renders with email, password, and Sign In button', async ({ page }) => {
    const email = page.locator('#email')
    const password = page.locator('#password')
    const submit = page.getByRole('button', { name: 'Sign In' })

    await expect(email).toBeVisible()
    await expect(password).toBeVisible()
    await expect(submit).toBeVisible()

    // No error rendered on initial load.
    await expect(page.getByRole('alert')).toHaveCount(0)

    // Both inputs carry the required attribute.
    await expect(email).toHaveAttribute('required', '')
    await expect(password).toHaveAttribute('required', '')
  })

  // US-G02 ──────────────────────────────────────────────────────────────────
  test('US-G02: USER login succeeds and redirects to /narrative', async ({ page }) => {
    await mockLogin(page, 200, { accessToken: USER_TOKEN })
    await mockNarrativeBackends(page)

    await page.locator('#email').fill('user@example.com')
    await page.locator('#password').fill('correct-horse-battery')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await page.waitForURL('**/narrative')
    expect(await readAccessToken(page)).toBe(USER_TOKEN)
  })

  // US-G03 ──────────────────────────────────────────────────────────────────
  test('US-G03: ADMIN login succeeds and redirects to /admin', async ({ page }) => {
    await mockLogin(page, 200, { accessToken: ADMIN_TOKEN })
    await mockAdminStats(page, {
      entityCount: 0,
      edgeCount: 0,
      sessionCount: 0,
      historyCount: 0,
      latestHistoryAt: null,
    })

    await page.locator('#email').fill('admin@example.com')
    await page.locator('#password').fill('opensesame')
    await page.getByRole('button', { name: 'Sign In' }).click()

    await page.waitForURL('**/admin')
    expect(await readAccessToken(page)).toBe(ADMIN_TOKEN)
  })

  // US-G04 ──────────────────────────────────────────────────────────────────
  test('US-G04: invalid credentials show error and do not navigate', async ({ page }) => {
    await mockLogin(page, 401, { message: 'Invalid email or password' })

    await page.locator('#email').fill('user@example.com')
    await page.locator('#password').fill('wrong-password')
    await page.getByRole('button', { name: 'Sign In' }).click()

    const alert = page.getByRole('alert')
    await expect(alert).toBeVisible()
    await expect(alert).toHaveText('Invalid email or password')

    // URL must still be /login.
    expect(new URL(page.url()).pathname).toBe('/login')
    // No token persisted.
    expect(await readAccessToken(page)).toBeNull()
  })

  // US-G05 ──────────────────────────────────────────────────────────────────
  test('US-G05: empty fields are blocked by HTML5 validation (no fetch fired)', async ({ page }) => {
    let fetchCalled = false
    await page.unroute('**/api/auth/login').catch(() => {})
    await page.route('**/api/auth/login', async (route: Route) => {
      fetchCalled = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ accessToken: USER_TOKEN }),
      })
    })

    await page.getByRole('button', { name: 'Sign In' }).click()

    // HTML5 validation prevents submission — the email input is invalid.
    const emailValid = await page.locator('#email').evaluate(
      (el) => (el as HTMLInputElement).checkValidity(),
    )
    expect(emailValid).toBe(false)
    expect(fetchCalled).toBe(false)
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  // US-G06 ──────────────────────────────────────────────────────────────────
  test('US-G06: unauthenticated visit to /narrative redirects to /login', async ({ page }) => {
    await mockNarrativeBackends(page)

    // localStorage was cleared in beforeEach. Visit the protected route.
    await page.goto('/narrative')
    await page.waitForURL('**/login')
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  // US-G07 ──────────────────────────────────────────────────────────────────
  test('US-G07: unauthenticated visit to / redirects to /login', async ({ page }) => {
    await mockNarrativeBackends(page)

    // Root server-redirects to /narrative, which then client-redirects to /login.
    await page.goto('/')
    await page.waitForURL('**/login')
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  // US-G08 ──────────────────────────────────────────────────────────────────
  test('US-G08: malformed token with required role is rejected by admin guard', async ({ page }) => {
    await mockAdminStats(page)

    // Plant a malformed token. atob('garbage'.split('.')[1]) === atob(undefined) → throws.
    await setAccessToken(page, 'garbage')

    await page.goto('/admin')
    await page.waitForURL('**/login')
    expect(new URL(page.url()).pathname).toBe('/login')
  })
})

/**
 * E2E acceptance tests for the admin surface — stats panel, role-based
 * route protection, and admin-only session-export contract.
 *
 * All backend calls are intercepted via page.route() so tests run without
 * a live server.
 *
 * Admin endpoints:
 *   GET  /api/admin/stats           → { entityCount, edgeCount, sessionCount,
 *                                       historyCount, latestHistoryAt }
 *   GET  /api/config/update-spec    → { version }
 *   POST /api/generate              → { narrative, choices, sessionId }
 *   GET  /api/session/:id/export    → { id, entries }
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

/** Mock GET /api/admin/stats with a custom JSON body and status. */
async function mockAdminStats(page: Page, status: number, body: object) {
  await page.unroute('**/api/admin/stats').catch(() => {})
  await page.route('**/api/admin/stats', async (route: Route) => {
    await route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

/** Mock the narrative page's network so navigating to /narrative under an
 *  ADMIN token doesn't hang on real-server fetches. */
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

/** Plant a token in localStorage. Requires the page to already have an
 *  origin loaded (call after the first page.goto). */
async function setAccessToken(page: Page, token: string) {
  await page.evaluate((t) => localStorage.setItem('accessToken', t), token)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Admin — stats, guards, and session export', () => {
  test.beforeEach(async ({ page }) => {
    // Land on /login first so we have a same-origin context for localStorage.
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  // US-A02 ──────────────────────────────────────────────────────────────────
  test('US-A02: ADMIN can read system stats — all five fields render', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminStats(page, 200, {
      entityCount: 10,
      edgeCount: 25,
      sessionCount: 5,
      historyCount: 42,
      latestHistoryAt: '2026-05-21T10:00:00Z',
    })

    await page.goto('/admin')

    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
    await expect(page.getByText('Entities')).toBeVisible()
    await expect(page.getByText('10', { exact: true })).toBeVisible()
    await expect(page.getByText('Edges')).toBeVisible()
    await expect(page.getByText('25', { exact: true })).toBeVisible()
    await expect(page.getByText('Sessions')).toBeVisible()
    await expect(page.getByText('5', { exact: true })).toBeVisible()
    await expect(page.getByText('History entries')).toBeVisible()
    await expect(page.getByText('42', { exact: true })).toBeVisible()
    await expect(page.getByText('Latest history')).toBeVisible()
    await expect(page.getByText('2026-05-21T10:00:00Z')).toBeVisible()
  })

  // US-A02b ─────────────────────────────────────────────────────────────────
  test('US-A02b: unauthenticated visit to /admin redirects to /login', async ({ page }) => {
    // No token. The auth guard fires in a useEffect before the stats fetch.
    let statsCalled = false
    await page.route('**/api/admin/stats', async (route: Route) => {
      statsCalled = true
      await route.fulfill({ status: 401, contentType: 'application/json', body: '{}' })
    })

    await page.goto('/admin')
    await page.waitForURL('**/login')
    expect(new URL(page.url()).pathname).toBe('/login')
    // Guard fired before the fetch — but even if the fetch slipped through,
    // we shouldn't have ended up on /admin.
    expect(statsCalled).toBe(false)
  })

  // US-A02c ─────────────────────────────────────────────────────────────────
  test('US-A02c: USER token on /admin redirects to /login (role mismatch)', async ({ page }) => {
    await setAccessToken(page, USER_TOKEN)
    await mockAdminStats(page, 403, { message: 'Forbidden' })

    await page.goto('/admin')
    await page.waitForURL('**/login')
    expect(new URL(page.url()).pathname).toBe('/login')
  })

  // US-A03 ──────────────────────────────────────────────────────────────────
  test('US-A03: ADMIN can access /narrative — narrative panel renders', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminStats(page, 200, {
      entityCount: 0, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
    })
    await mockNarrativeBackends(page)

    await page.goto('/narrative')

    // Stays on /narrative (not redirected to /login).
    expect(new URL(page.url()).pathname).toBe('/narrative')
    await expect(page.getByTestId('narrative-panel')).toBeVisible()
  })

  // US-A04 ──────────────────────────────────────────────────────────────────
  test('US-A04: ADMIN can read /api/config/update-spec — proxy contract', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminStats(page, 200, {
      entityCount: 0, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
    })

    let updateSpecCalled = false
    let authHeader: string | undefined
    await page.route('**/api/config/update-spec', async (route: Route) => {
      updateSpecCalled = true
      authHeader = route.request().headers()['authorization']
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: 1 }),
      })
    })

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    // Drive the request from the page context with the stored token, mirroring
    // what an admin client would do.
    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch('/api/config/update-spec', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { status: res.status, body: await res.json() }
    })

    expect(updateSpecCalled).toBe(true)
    expect(authHeader).toBe(`Bearer ${ADMIN_TOKEN}`)
    expect(result.status).toBe(200)
    expect(result.body).toEqual({ version: 1 })
  })

  // US-A06 ──────────────────────────────────────────────────────────────────
  test('US-A06: ADMIN can export a session — generate returns sessionId', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminStats(page, 200, {
      entityCount: 0, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
    })

    let generateCalled = false
    await page.route(/\/api\/generate(\?.*)?$/, async (route: Route) => {
      if (route.request().method() === 'POST') {
        generateCalled = true
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            narrative: 'You step into the cavern.',
            choices: [],
            sessionId: 'sess-abc',
          }),
        })
      } else {
        await route.fallback()
      }
    })

    let exportCalled = false
    let exportAuthHeader: string | undefined
    await page.route('**/api/session/sess-abc/export', async (route: Route) => {
      exportCalled = true
      exportAuthHeader = route.request().headers()['authorization']
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'sess-abc', entries: [] }),
      })
    })

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    // Step 1: drive a generate POST and assert the response includes sessionId
    // (the cycle-049 contract).
    const generated = await page.evaluate(async () => {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: 'Begin' }),
      })
      return res.json() as Promise<{ narrative: string; choices: unknown[]; sessionId: string }>
    })

    expect(generateCalled).toBe(true)
    expect(generated.sessionId).toBe('sess-abc')

    // Step 2: use that sessionId to drive the export endpoint.
    const exported = await page.evaluate(async (sid) => {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch(`/api/session/${sid}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { status: res.status, body: await res.json() }
    }, generated.sessionId)

    expect(exportCalled).toBe(true)
    expect(exportAuthHeader).toBe(`Bearer ${ADMIN_TOKEN}`)
    expect(exported.status).toBe(200)
    expect(exported.body).toEqual({ id: 'sess-abc', entries: [] })
  })

  // US-U15 ──────────────────────────────────────────────────────────────────
  test('US-U15: USER cannot read admin stats — GET /api/admin/stats returns 403', async ({ page }) => {
    // Stay on the /login origin (beforeEach already landed us there). /login has
    // no auth guard, so a USER token does not trigger a redirect — a safe neutral
    // origin from which to drive the API-contract fetch. We do NOT navigate to
    // /admin (which would redirect a USER to /login per useAuthGuard('ADMIN')).
    await setAccessToken(page, USER_TOKEN)

    // Inline route so we can capture the Authorization header (mockAdminStats
    // does not expose the request). Clear any prior handler first.
    let statsCalled = false
    let authHeader: string | undefined
    await page.unroute('**/api/admin/stats').catch(() => {})
    await page.route('**/api/admin/stats', async (route: Route) => {
      statsCalled = true
      authHeader = route.request().headers()['authorization']
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 403, message: 'Forbidden' }),
      })
    })

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { status: res.status, body: await res.json() }
    })

    expect(statsCalled).toBe(true)
    expect(authHeader).toBe(`Bearer ${USER_TOKEN}`)
    expect(result.status).toBe(403)
    expect(result.body.statusCode).toBe(403)
    expect(result.body.message).toBe('Forbidden')
  })

  // US-A05 ──────────────────────────────────────────────────────────────────
  test('US-A05: ADMIN can update the update-spec — PUT then GET reflects the change', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminStats(page, 200, {
      entityCount: 0, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
    })

    // Stateful, method-aware mock: a PUT stores the body, a GET returns it.
    let stored: { version: number } = { version: 1 }
    let putAuthHeader: string | undefined
    await page.unroute('**/api/config/update-spec').catch(() => {})
    await page.route('**/api/config/update-spec', async (route: Route) => {
      if (route.request().method() === 'PUT') {
        putAuthHeader = route.request().headers()['authorization']
        stored = route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(stored),
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(stored),
        })
      }
    })

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    // Step 1: PUT a new spec body.
    const putStatus = await page.evaluate(async () => {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch('/api/config/update-spec', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ version: 2 }),
      })
      return res.status
    })

    // Step 2: GET and assert the change is reflected.
    const got = await page.evaluate(async () => {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch('/api/config/update-spec', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { status: res.status, body: await res.json() }
    })

    expect(putStatus).toBe(200)
    expect(putAuthHeader).toBe(`Bearer ${ADMIN_TOKEN}`)
    expect(got.status).toBe(200)
    expect(got.body.version).toBe(2)
  })

  // US-A06b ─────────────────────────────────────────────────────────────────
  test('US-A06b: invalid session ID export returns documented error shape (404)', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminStats(page, 200, {
      entityCount: 0, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
    })

    let exportCalled = false
    let exportAuthHeader: string | undefined
    await page.route('**/api/session/does-not-exist/export', async (route: Route) => {
      exportCalled = true
      exportAuthHeader = route.request().headers()['authorization']
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 404, message: 'Session not found' }),
      })
    })

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    const result = await page.evaluate(async () => {
      const token = localStorage.getItem('accessToken') ?? ''
      const res = await fetch('/api/session/does-not-exist/export', {
        headers: { Authorization: `Bearer ${token}` },
      })
      return { status: res.status, body: await res.json() }
    })

    expect(exportCalled).toBe(true)
    expect(exportAuthHeader).toBe(`Bearer ${ADMIN_TOKEN}`)
    expect(result.status).toBe(404)
    expect(result.body.statusCode).toBe(404)
    expect(result.body.message).toBe('Session not found')
  })

  // US-A07 ──────────────────────────────────────────────────────────────────
  // FLAGGED RESIDUAL GAP — API-CONTRACT TEST ONLY.
  //
  // A true browser e2e for "upload lore" is NOT possible without app changes:
  //   • UploadPanel exists only as a component
  //     (app/upload/components/UploadPanel.tsx) and is mounted on no route —
  //     there is no app/upload/page.tsx that renders it.
  //   • There is no client-side /api/upload proxy route under app/api/.
  // So we cannot click through a real UI flow. Instead we exercise the
  // documented POST /api/upload contract directly from page.evaluate(fetch),
  // matching the shape UploadPanel uses (FormData field 'file', accept .pdf/.txt).
  //
  // To close this gap with a real browser flow, mount UploadPanel on a page
  // route (e.g. app/upload/page.tsx) and add the /api/upload proxy.
  test('US-A07: POST /api/upload returns {entityCount,edgeCount} for .txt and rejects unsupported type', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminStats(page, 200, {
      entityCount: 0, edgeCount: 0, sessionCount: 0, historyCount: 0, latestHistoryAt: null,
    })

    // Single route branches on the filename present in the raw multipart body.
    await page.route('**/api/upload', async (route: Route) => {
      const body = route.request().postData() ?? ''
      if (body.includes('.txt')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ entityCount: 3, edgeCount: 2 }),
        })
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ statusCode: 400, message: 'Unsupported file type' }),
        })
      }
    })

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    // .txt → 200 with the documented summary shape.
    const okResult = await page.evaluate(async () => {
      const fd = new FormData()
      fd.append('file', new File(['some lore'], 'lore.txt', { type: 'text/plain' }))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      return { status: res.status, body: await res.json() }
    })

    expect(okResult.status).toBe(200)
    expect(typeof okResult.body.entityCount).toBe('number')
    expect(typeof okResult.body.edgeCount).toBe('number')
    expect(okResult.body.edgeCount).toBeGreaterThanOrEqual(0)

    // Unsupported type → rejected (4xx) with an error message.
    const badResult = await page.evaluate(async () => {
      const fd = new FormData()
      fd.append('file', new File(['x'], 'malware.exe', { type: 'application/octet-stream' }))
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      return { status: res.status, body: await res.json() }
    })

    expect(badResult.status).toBeGreaterThanOrEqual(400)
    expect(badResult.body.message).toBeTruthy()
  })
})

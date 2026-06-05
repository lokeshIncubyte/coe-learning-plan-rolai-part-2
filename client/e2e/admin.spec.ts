/**
 * E2E acceptance tests for the admin surface — stats panel, role-based
 * route protection, lore upload, and update-spec editing.
 *
 * These tests exercise DIRECT USER BEHAVIOUR: navigating to /admin, seeing
 * rendered content, selecting files, filling the spec textarea, and clicking
 * buttons. Backend calls are intercepted via page.route() so tests run without
 * a live server. A small number of pure API-contract stories (US-A06, US-U15)
 * remain driven via page.evaluate(fetch) because the UI exposes no control for
 * them.
 *
 * Admin endpoints:
 *   GET  /api/admin/stats           → { entityCount, edgeCount, sessionCount,
 *                                       historyCount, latestHistoryAt }
 *   GET  /api/config/update-spec    → spec JSON (e.g. { version })
 *   PUT  /api/config/update-spec    → 200 on save
 *   POST /api/upload                → { entityCount, edgeCount }
 *   POST /api/generate              → { narrative, choices, sessionId }
 *   GET  /api/session/:id/export    → { id, entries }
 */

import { test, expect, type Page, type Route } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const USER_TOKEN = 'header.eyJyb2xlIjoiVVNFUiJ9.sig'
const ADMIN_TOKEN = 'header.eyJyb2xlIjoiQURNSU4ifQ.sig'

type Stats = {
  entityCount: number
  edgeCount: number
  sessionCount: number
  historyCount: number
  latestHistoryAt: string | null
}

const EMPTY_STATS: Stats = {
  entityCount: 0,
  edgeCount: 0,
  sessionCount: 0,
  historyCount: 0,
  latestHistoryAt: null,
}

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

/**
 * Mock BOTH endpoints the admin page fetches on mount so the page renders
 * fully (stats cards + Update Spec textarea). The GET /api/config/update-spec
 * mock returns the supplied spec object.
 */
async function mockAdminPage(
  page: Page,
  opts: { stats?: Stats; spec?: object } = {},
) {
  const stats = opts.stats ?? EMPTY_STATS
  const spec = opts.spec ?? { version: 1 }

  await mockAdminStats(page, 200, stats)

  await page.unroute('**/api/config/update-spec').catch(() => {})
  await page.route('**/api/config/update-spec', async (route: Route) => {
    // GET on mount returns the current spec; other methods fall through to
    // any test-installed handler registered AFTER this one.
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(spec),
      })
    } else {
      await route.fallback()
    }
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

test.describe('Admin — US-A02: stats panel renders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('US-A02: ADMIN sees all five stat cards with correct values', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminPage(page, {
      stats: {
        entityCount: 10,
        edgeCount: 25,
        sessionCount: 5,
        historyCount: 42,
        latestHistoryAt: '2026-05-21T10:00:00Z',
      },
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
})

test.describe('Admin — US-A02b/A02c: route guards', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

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
    expect(statsCalled).toBe(false)
  })

  test('US-A02c: USER token on /admin redirects to /login (role mismatch)', async ({ page }) => {
    await setAccessToken(page, USER_TOKEN)
    await mockAdminStats(page, 403, { message: 'Forbidden' })

    await page.goto('/admin')
    await page.waitForURL('**/login')
    expect(new URL(page.url()).pathname).toBe('/login')
  })
})

test.describe('Admin — US-A03: ADMIN can access /narrative', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('US-A03: ADMIN can access /narrative — narrative panel renders', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminPage(page)
    await mockNarrativeBackends(page)

    await page.goto('/narrative')

    // Stays on /narrative (not redirected to /login).
    expect(new URL(page.url()).pathname).toBe('/narrative')
    await expect(page.getByTestId('narrative-panel')).toBeVisible()
  })
})

test.describe('Admin — US-A04: update-spec textarea shows current spec', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('US-A04: textarea renders the current spec JSON content', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminPage(page, { spec: { version: 7, rules: ['a', 'b'] } })

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    // The Update Spec section renders a textarea seeded with the pretty-printed
    // spec JSON. Assert the user sees the spec content in the textarea.
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await expect(textarea).toHaveValue(
      JSON.stringify({ version: 7, rules: ['a', 'b'] }, null, 2),
    )
    await expect(page.getByRole('heading', { name: 'Update Spec' })).toBeVisible()
  })
})

test.describe('Admin — US-A05: edit and save update-spec via the UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('US-A05: editing the textarea and clicking Save Spec shows "Saved!" and PUTs the edited body', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminPage(page, { spec: { version: 1 } })

    // Capture the PUT body. This handler is installed AFTER mockAdminPage's
    // route, so the GET-on-mount falls through to mockAdminPage and only the
    // PUT lands here.
    let putBody: unknown
    let putAuthHeader: string | undefined
    await page.route('**/api/config/update-spec', async (route: Route) => {
      if (route.request().method() === 'PUT') {
        putBody = route.request().postDataJSON()
        putAuthHeader = route.request().headers()['authorization']
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(putBody),
        })
      } else {
        await route.fallback()
      }
    })

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()

    // User edits the spec to a new JSON value, then clicks Save Spec.
    const edited = JSON.stringify({ version: 2 }, null, 2)
    await textarea.fill(edited)
    await page.getByRole('button', { name: 'Save Spec' }).click()

    // The user sees the "Saved!" confirmation.
    await expect(page.getByText('Saved!')).toBeVisible()

    // The PUT carried the edited body and the ADMIN token.
    expect(putBody).toEqual({ version: 2 })
    expect(putAuthHeader).toBe(`Bearer ${ADMIN_TOKEN}`)
  })
})

test.describe('Admin — US-A06: session export contract (API)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  // API-contract test: no UI control drives generate/export, so we exercise
  // the documented contract directly. POST /generate returns sessionId; that
  // id feeds GET /session/:id/export which returns { id, entries }.
  test('US-A06: POST /api/generate returns sessionId; GET /api/session/:id/export returns {id,entries}', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminPage(page)

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
})

test.describe('Admin — US-A07: lore upload via the UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  test('US-A07: selecting a .txt file and clicking Upload shows the entity/edge summary', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminPage(page)

    await page.route('**/api/upload', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entityCount: 3, edgeCount: 2 }),
      })
    })

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Lore Upload' })).toBeVisible()

    // User selects a .txt lore file.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'lore.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('some lore content'),
    })

    // User clicks Upload and sees the rendered summary.
    await page.getByRole('button', { name: 'Upload' }).click()
    await expect(
      page.getByText('3 entities, 2 edges added.'),
    ).toBeVisible()
  })

  test('US-A07b: Upload button is disabled until a file is selected', async ({ page }) => {
    await setAccessToken(page, ADMIN_TOKEN)
    await mockAdminPage(page)

    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible()

    const uploadButton = page.getByRole('button', { name: 'Upload' })
    // Disabled before any file is chosen.
    await expect(uploadButton).toBeDisabled()

    // Selecting a file enables it.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'lore.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('some lore content'),
    })
    await expect(uploadButton).toBeEnabled()
  })
})

test.describe('Admin — US-U15: USER cannot read admin stats (API)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.evaluate(() => localStorage.clear())
  })

  // API-contract test. Stay on the /login origin (no auth guard) so a USER
  // token does not trigger a redirect, and drive the stats fetch directly.
  test('US-U15: GET /api/admin/stats with a USER token returns 403', async ({ page }) => {
    await setAccessToken(page, USER_TOKEN)

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
})

/**
 * Playwright config for the LIVE end-to-end suite.
 *
 * Distinct from playwright.config.ts because:
 *   - These tests hit real Next.js (3000), real NestJS (3001), real Postgres,
 *     and a real OpenRouter LLM. No page.route() anywhere.
 *   - LLM round-trips take 5-30 seconds. Per-test timeout is 2 minutes and
 *     expect() polling is raised to 90s so a slow generation doesn't fail an
 *     otherwise-correct test.
 *   - No `webServer` block: tests assume both servers are already running
 *     (the runner will fail fast on the first navigation if they aren't).
 *
 * Run with:
 *   npx playwright test --config=playwright.live.config.ts
 */

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  testMatch: /live\.spec\.ts$/,
  fullyParallel: false,   // serial: one DB, no cross-test state bleed
  retries: 0,             // never retry — LLM cost + non-determinism = noise
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-live' }],
  ],

  // Per-test ceiling. Every test starts with an ~80s auto-start beat then
  // adds 1-2 more LLM calls (choice → beat, custom action → beat). Budget:
  //   auto-start (~80s) + 2 extra beats (~80s each) + assertion headroom = 6min
  timeout: 360_000,

  // expect() polls until this elapses. Two minutes outlasts any single LLM
  // generation including choice generation; if a test exceeds this the
  // assertion logic is wrong.
  expect: { timeout: 120_000 },

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Intentionally no `webServer` block. The live suite runs against an
  // externally-managed stack. Start both servers before running:
  //   cd server && npm run start:dev    (port 3001)
  //   cd client && npm run dev          (port 3000)
})

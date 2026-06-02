import { defineConfig, devices } from '@playwright/test'

// Port defaults to 3000 (unchanged repo behaviour); override with E2E_PORT
// when 3000 is occupied by another app locally.
const PORT = Number(process.env.E2E_PORT ?? 3000)
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
  },
})

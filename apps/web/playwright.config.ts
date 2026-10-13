import { defineConfig, devices } from '@playwright/test'

const KOTLIN_COMPILER_URL = 'http://127.0.0.1:3080'

export default defineConfig({
  testDir: './src',
  testMatch: '**/*.test.e2e.ts',
  testIgnore: 'e2e/production/**',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  retries: process.env.CI === undefined ? 0 : 2,
  reporter: process.env.CI === undefined ? 'list' : 'github',
  use: {
    baseURL: 'http://localhost:3000',
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: ['**/play-template-go.test.e2e.ts', '**/play-template-kotlin.test.e2e.ts'],
    },
  ],
  webServer: [
    {
      command: 'node scripts/serve-kotlin-compiler.ts 3080',
      url: `${KOTLIN_COMPILER_URL}/health`,
      reuseExistingServer: process.env.CI === undefined,
      timeout: 600_000,
      gracefulShutdown: { signal: 'SIGTERM', timeout: 10_000 },
    },
    {
      command: 'pnpm dev',
      url: 'http://localhost:3000',
      env: { KOTLIN_COMPILER_URL },
      reuseExistingServer: process.env.CI === undefined,
      timeout: 120_000,
    },
  ],
})

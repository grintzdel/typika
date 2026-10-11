import { defineConfig, devices } from '@playwright/test'

const external = process.env.TYPIKA_E2E_APP_URL !== undefined

export default defineConfig({
  testDir: './src/e2e/production',
  testMatch: '**/*.test.e2e.ts',
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  reporter: process.env.CI === undefined ? 'list' : 'github',
  use: { locale: 'fr-FR', timezoneId: 'Europe/Paris', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  ...(external
    ? {}
    : {
        webServer: {
          command: 'pnpm build && pnpm start',
          url: 'http://localhost:3100/',
          reuseExistingServer: false,
          timeout: 180_000,
          env: {
            PORT: '3100',
            TYPIKA_PUBLIC_URL: 'http://localhost:3100',
            TYPIKA_RUNTIME_ORIGIN: 'http://127.0.0.1:3100',
          },
        },
      }),
})

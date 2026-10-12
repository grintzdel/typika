import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  server: { hmr: false },
  test: {
    testTimeout: 60_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'conformance/**/*.test.ts'],
          exclude: ['src/**/*.browser.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }, { browser: 'webkit' }],
          },
        },
      },
    ],
  },
})

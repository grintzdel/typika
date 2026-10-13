import { fileURLToPath } from 'node:url'

import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

import { kotlinCompilerProxy } from './test/kotlin-compiler-proxy.plugin.ts'

const SERVICE_TIMEOUTS = { hookTimeout: 600_000, testTimeout: 120_000 }
const GLOBAL_SETUP = [fileURLToPath(import.meta.resolve('@typika/kotlin-compiler/global-setup'))]

export default defineConfig({
  server: { hmr: false },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', include: ['src/**/*.test.ts'], exclude: ['src/**/*.browser.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'conformance',
          include: ['conformance/**/*.test.ts'],
          globalSetup: GLOBAL_SETUP,
          ...SERVICE_TIMEOUTS,
        },
      },
      {
        extends: true,
        plugins: [kotlinCompilerProxy()],
        test: {
          name: 'browser',
          include: ['src/**/*.browser.test.ts'],
          globalSetup: GLOBAL_SETUP,
          ...SERVICE_TIMEOUTS,
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

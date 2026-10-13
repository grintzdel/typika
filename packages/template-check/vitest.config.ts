import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const KOTLIN_TESTS = 'src/run-kotlin-tests/*.test.ts'

export default defineConfig({
  test: {
    projects: [
      { extends: true, test: { name: 'unit', include: ['src/**/*.test.ts'], exclude: [KOTLIN_TESTS] } },
      {
        extends: true,
        test: {
          name: 'kotlin',
          include: [KOTLIN_TESTS],
          globalSetup: [fileURLToPath(import.meta.resolve('@typika/kotlin-compiler/global-setup'))],
          hookTimeout: 600_000,
          testTimeout: 120_000,
        },
      },
    ],
  },
})

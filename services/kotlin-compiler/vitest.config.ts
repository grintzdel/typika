import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globalSetup: ['test/containers.global-setup.ts'],
    hookTimeout: 600_000,
    testTimeout: 60_000,
    fileParallelism: false,
  },
})

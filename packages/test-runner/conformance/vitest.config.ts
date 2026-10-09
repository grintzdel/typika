import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    root: import.meta.dirname,
    include: ['fixtures/*.test.ts'],
    reporters: ['@typika/vitest-reporter'],
  },
})

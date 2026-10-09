import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const ALIASED_ROOTS = [
  fileURLToPath(new URL('./conformance/fixtures/', import.meta.url)),
  fileURLToPath(new URL('../../templates/', import.meta.url)),
]
const RUNNER = fileURLToPath(new URL('./src/index.ts', import.meta.url))

export default defineConfig({
  plugins: [
    {
      name: 'typika-test-runner-alias',
      enforce: 'pre',
      resolveId: (source, importer) =>
        source === 'vitest' && ALIASED_ROOTS.some((root) => importer?.startsWith(root)) ? RUNNER : undefined,
    },
  ],
  test: {
    include: ['src/**/*.test.ts', 'conformance/*.test.ts'],
  },
})

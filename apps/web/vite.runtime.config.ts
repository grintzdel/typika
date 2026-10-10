import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'

import { runtimeConfigEndpoint, withDevEnv } from './vite/dev-servers.ts'
import { RUNTIME_HEADERS } from './vite/isolation-headers.ts'

withDevEnv()

export default defineConfig({
  root: 'src/runtime-frame',
  base: '/runtime/',
  publicDir: false,
  cacheDir: fileURLToPath(new URL('./node_modules/.vite-runtime', import.meta.url)),
  clearScreen: false,
  server: { host: '127.0.0.1', port: 3001, strictPort: true, hmr: false, headers: RUNTIME_HEADERS },
  plugins: [runtimeConfigEndpoint()],
  worker: { format: 'es' },
  build: {
    outDir: '../../dist/runtime',
    emptyOutDir: true,
    rolldownOptions: { input: fileURLToPath(new URL('./src/runtime-frame/frame.html', import.meta.url)) },
  },
})

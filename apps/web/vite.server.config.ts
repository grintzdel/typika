import { defineConfig } from 'vite'

export default defineConfig({
  ssr: { noExternal: true },
  build: {
    ssr: 'server/main.ts',
    outDir: 'dist/node',
    emptyOutDir: true,
    target: 'node24',
    rolldownOptions: { output: { entryFileNames: 'main.js' } },
  },
})

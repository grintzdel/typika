import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { appHeaders, runtimeFrameDevServer } from './vite/dev-servers.ts'
import { registryIndexPlugin } from './vite/registry-index.ts'
import { typescriptLibraries } from './vite/typescript-libraries.ts'

const PRERENDERED_PAGE = /^\/(?:play\/_shell|templates(?:\/[a-z0-9-]+)?)?$/

export default defineConfig(({ command }) => ({
  server: { port: 3000, strictPort: true },
  preview: { host: '127.0.0.1' },
  ssr: command === 'build' ? { noExternal: true } : {},
  worker: { format: 'es', plugins: () => [typescriptLibraries()] },
  plugins: [
    appHeaders(),
    runtimeFrameDevServer(),
    typescriptLibraries(),
    registryIndexPlugin(),
    tailwindcss(),
    tanstackStart({
      spa: { enabled: true, maskPath: '/play/_shell' },
      prerender: { enabled: true, autoStaticPathsDiscovery: false, filter: ({ path }) => PRERENDERED_PAGE.test(path) },
      pages: [{ path: '/' }, { path: '/templates' }],
    }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
}))

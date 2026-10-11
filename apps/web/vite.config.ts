import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { appHeaders, runtimeFrameDevServer } from './vite/dev-servers.ts'

export default defineConfig(({ command }) => ({
  server: { port: 3000, strictPort: true },
  preview: { host: '127.0.0.1' },
  ssr: command === 'build' ? { noExternal: true } : {},
  plugins: [
    appHeaders(),
    runtimeFrameDevServer(),
    tailwindcss(),
    tanstackStart({ spa: { enabled: true } }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
}))

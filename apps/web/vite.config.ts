import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { appHeaders, runtimeFrameDevServer } from './vite/dev-servers.ts'

export default defineConfig({
  server: { port: 3000, strictPort: true },
  plugins: [
    appHeaders(),
    runtimeFrameDevServer(),
    tailwindcss(),
    tanstackStart({ spa: { enabled: true } }),
    react(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
})

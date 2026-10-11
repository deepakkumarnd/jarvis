import path from 'node:path'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 8000,
    strictPort: true,
    // Forward API calls and the Rails health check to Rails so the app can use relative URLs and avoid CORS in dev
    proxy: {
      '/api': 'http://localhost:8001',
      '/up': 'http://localhost:8001',
    },
  },
})

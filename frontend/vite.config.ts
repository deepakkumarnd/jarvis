import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    port: 5173,
    // Forward API calls to Rails so the app can use relative URLs and avoid CORS in dev
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})

import { defineConfig } from 'vite'

// Note: For GitHub Pages deployment, update 'base' to match your repo name
// e.g., base: '/GBJS/' for https://github.com/acr575/GBJS
export default defineConfig({
  build: {
    outDir: 'dist',
  },
  server: {
    port: 5173,
  },
})

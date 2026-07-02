import { defineConfig } from 'vite'

export default defineConfig({
  base: '/anniv/',
  build: {
    outDir: 'dist'
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat']
  }
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/rocadragon.github.io/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://79.143.88.84:3001',
        changeOrigin: true,
      },
    },
  },
})

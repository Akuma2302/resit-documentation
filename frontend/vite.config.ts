import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: {
    port: 5173,
    // In development the backend runs on port 4000; proxying keeps API calls same-origin
    proxy: { '/api': 'http://localhost:4000' },
  },
})

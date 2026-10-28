import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// The browser only ever talks to this server; /api/* is forwarded to the FastAPI backend
// with the /api prefix removed, in both `vite` (dev) and `vite preview` (exhibition), so no CORS is needed.
const apiProxy = {
  '/api/': {
    target: 'http://localhost:8000',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // strictPort: the QR codes point at :5173, so fail loudly instead of moving to another port.
  server: { port: 5173, strictPort: true, proxy: apiProxy },
  preview: { port: 5173, strictPort: true, proxy: apiProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})

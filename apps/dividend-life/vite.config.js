import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const workspaceRoot = path.resolve(__dirname, '..', '..')

// https://vite.dev/config/
export default defineConfig({
  envDir: workspaceRoot,
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
      '@dividend-life': path.resolve(__dirname, './src'),
      '@balance-life': path.resolve(__dirname, '../balance-life/src'),
      '@health-life': path.resolve(__dirname, '../health-life/src'),
      '@wealth-life': path.resolve(__dirname, '../wealth-life/src'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
    proxy: {
      '/get_dividend': 'http://127.0.0.1:8001',
      '/update_dividend': 'http://127.0.0.1:8001',
      '/get_stock_list': 'http://127.0.0.1:8001',
      '/site_stats': 'http://127.0.0.1:8001',
      '/nl_query': 'http://127.0.0.1:8001',
      '/get_returns': 'http://127.0.0.1:8001',
      '/dividend_helper': 'http://127.0.0.1:8001',
    },
  },
  preview: {
    fs: {
      allow: [path.resolve(__dirname, '..')],
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
})

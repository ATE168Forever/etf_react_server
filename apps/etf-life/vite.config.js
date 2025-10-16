import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const loadedEnv = loadEnv(mode, process.cwd(), '')
  const publicEnvEntries = Object.entries(loadedEnv).filter(([key]) =>
    key.startsWith('VITE_')
  )
  const publicEnv = Object.fromEntries(publicEnvEntries)

  return {
    plugins: [
      {
        name: 'expose-vite-env-to-window',
        transformIndexHtml() {
          return {
            tags: [
              {
                tag: 'script',
                injectTo: 'head',
                children: `window.__APP_ENV__ = Object.assign({}, window.__APP_ENV__, ${JSON.stringify(
                  publicEnv
                )});`
              }
            ]
          }
        }
      },
      react()
    ]
  }
})

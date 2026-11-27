import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ['PAGES_BASE'])
  const path = (process.env.PAGES_BASE ?? env.PAGES_BASE ?? (mode === 'production' ? '/grape-tuner/' : '/')).replace(/^\/+|\/+$/g, '')
  const base = path ? `/${path}/` : '/'

  return {
    base,
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        scope: base,
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: 'index.html',
          cleanupOutdatedCaches: true,
        },
        manifest: {
          id: './',
          name: 'grapetuner',
          short_name: 'grapetuner',
          description: 'Guitar and chromatic tuner',
          lang: 'en',
          scope: './',
          start_url: './',
          display: 'standalone',
          theme_color: '#141b19',
          background_color: '#141b19',
          icons: [
            { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
      }),
    ],
    build: { target: ['es2022', 'safari16'] },
  }
})

import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import contentCollections from '@content-collections/vite'
import viteReact from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    contentCollections(),
    tsconfigPaths(),
    tanstackStart({
      prerender: {
        enabled: false, // 使用运行时 SSR
      },
      sitemap: {
        enabled: true,
        host: 'https://docs.memokit.dev',
      },
    }),
    nitro(),
    viteReact(),
    tailwindcss(),
  ],
})

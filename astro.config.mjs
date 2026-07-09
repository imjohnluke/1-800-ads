// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import node from '@astrojs/node'

export default defineConfig({
  site: 'https://1-800ads.com',
  trailingSlash: 'always',
  adapter: node({ mode: 'standalone' }),
  integrations: [react()],
})

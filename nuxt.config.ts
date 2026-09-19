import { fileURLToPath } from 'node:url'
import { resolveTheme } from './tooling/theme'

const theme = resolveTheme(
  fileURLToPath(new URL('.', import.meta.url)),
  process.env.PORTAL_THEME || 'nuxtui'
)

export default defineNuxtConfig({
  ...theme.moduleOptions,
  compatibilityDate: '2026-09-19',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/eslint', ...theme.modules],
  components: [
    { path: '~/components', pathPrefix: false },
    { path: `${theme.directory}/components`, pathPrefix: false }
  ],
  plugins: theme.plugins,
  css: ['~/assets/css/main.css', ...theme.css],
  app: {
    head: {
      title: 'GCS–SSC | Organization portal',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'referrer', content: 'no-referrer' }
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }]
    }
  },
  vite: {
    vue: {
      template: {
        compilerOptions: {
          isCustomElement: (tag) =>
            theme.customElementPrefixes.some((prefix) => tag.startsWith(prefix))
        }
      }
    }
  },
  nitro: { preset: 'node-server' },
  typescript: { strict: true }
})

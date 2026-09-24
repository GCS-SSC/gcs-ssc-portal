export default defineNuxtConfig({
  compatibilityDate: '2026-09-19',
  ssr: false,
  devtools: { enabled: false },
  modules: ['@nuxt/eslint'],
  components: [{ path: '~/components', pathPrefix: false }],
  css: ['~/assets/css/main.css', '~/assets/css/gcds.css'],
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
    optimizeDeps: { include: ['zod', 'nanoid', '@gcs-ssc/survey', '@gcs-ssc/survey/vue'] },
    vue: {
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith('gcds-')
        }
      }
    }
  },
  nitro: { preset: 'node-server' },
  typescript: { strict: true }
})

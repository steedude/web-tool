import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
        { rel: 'icon', sizes: 'any', href: '/favicon.ico' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  compatibilityDate: '2025-07-15',
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },
  eslint: {
    config: {
      standalone: false,
    },
  },
  modules: [
    '@nuxt/eslint',
    '@nuxtjs/i18n',
  ],
  i18n: {
    defaultLocale: 'zh-TW',
    strategy: 'prefix_except_default',
    locales: [
      { code: 'zh-TW', name: '繁體中文', file: 'zh-TW.json' },
      { code: 'en', name: 'English', file: 'en.json' },
    ],
    langDir: 'locales',
  },
  runtimeConfig: {
    supabaseServiceRoleKey: '',
    public: {
      realtimeUrl: 'wss://ws.3854335.com/ws',
      supabasePublishableKey: '',
      supabaseUrl: '',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})

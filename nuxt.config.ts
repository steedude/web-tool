import process from 'node:process'
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
    '@sentry/nuxt/module',
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
    sentryDsn: process.env.SENTRY_DSN || '',
    supabaseServiceRoleKey: '',
    public: {
      realtimeUrl: '',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '',
      sentryEnvironment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || '',
      siteUrl: '',
      supabasePublishableKey: '',
      supabaseUrl: '',
      turnCredential: '',
      turnUrl: '',
      turnUsername: '',
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
})

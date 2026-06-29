interface PageSeoOptions {
  description: () => string
  noindex?: boolean
  schema?: () => Record<string, unknown>
  title: () => string
}

const DEFAULT_SITE_URL = 'https://tool.3854335.com'
const DEFAULT_OG_IMAGE_PATH = '/og-image.svg'

export function usePageSeo(options: PageSeoOptions) {
  const route = useRoute()
  const runtimeConfig = useRuntimeConfig()

  const siteUrl = computed(() => String(runtimeConfig.public.siteUrl || DEFAULT_SITE_URL).replace(/\/$/, ''))
  const canonicalUrl = computed(() => `${siteUrl.value}${route.path}`)
  const ogImageUrl = computed(() => `${siteUrl.value}${DEFAULT_OG_IMAGE_PATH}`)
  const robots = computed(() => options.noindex ? 'noindex, nofollow' : 'index, follow')

  useSeoMeta({
    description: options.description,
    ogDescription: options.description,
    ogImage: () => ogImageUrl.value,
    ogTitle: options.title,
    ogUrl: () => canonicalUrl.value,
    robots: () => robots.value,
    title: options.title,
    twitterCard: 'summary_large_image',
    twitterDescription: options.description,
    twitterImage: () => ogImageUrl.value,
    twitterTitle: options.title,
  })

  useHead(() => ({
    link: [
      { href: canonicalUrl.value, rel: 'canonical' },
    ],
    script: options.schema
      ? [
          {
            children: JSON.stringify(options.schema()),
            type: 'application/ld+json',
          },
        ]
      : [],
  }))
}

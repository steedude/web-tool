import type { H3Event } from 'h3'

function getSiteUrl(event: H3Event) {
  return String(useRuntimeConfig(event).public.siteUrl || getRequestURL(event).origin).replace(/\/$/, '')
}

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')

  return `User-agent: *
Allow: /
Disallow: /s/
Disallow: /image/

Sitemap: ${getSiteUrl(event)}/sitemap.xml
`
})

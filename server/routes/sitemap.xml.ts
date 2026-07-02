import type { H3Event } from 'h3'

const STATIC_PATHS = ['/', '/draw', '/drop', '/links'] as const

function getSiteUrl(event: H3Event) {
  return String(useRuntimeConfig(event).public.siteUrl || getRequestURL(event).origin).replace(/\/$/, '')
}

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  const siteUrl = getSiteUrl(event)
  const updatedAt = new Date().toISOString()
  const urls = STATIC_PATHS.map(path => `  <url>
    <loc>${siteUrl}${path}</loc>
    <lastmod>${updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
})

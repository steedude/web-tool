const SITE_URL = 'https://tool.3854335.com'
const STATIC_PATHS = ['/', '/draw', '/drop', '/links'] as const

export default defineEventHandler((event) => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')

  const updatedAt = new Date().toISOString()
  const urls = STATIC_PATHS.map(path => `  <url>
    <loc>${SITE_URL}${path}</loc>
    <lastmod>${updatedAt}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
})

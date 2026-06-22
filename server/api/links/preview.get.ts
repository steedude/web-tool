import { assertPublicDestination, normalizePublicUrl } from '../../utils/urls'

function decodeEntities(value: string) {
  return value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, String.fromCharCode(39)).replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["']`, 'i'),
  ]
  return patterns.map(pattern => html.match(pattern)?.[1]).find(Boolean)
}

async function safeFetch(startUrl: URL) {
  let current = startUrl
  for (let redirect = 0; redirect <= 4; redirect++) {
    await assertPublicDestination(current)
    const response = await fetch(current, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; WebLabPreview/1.0)' },
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    })
    if (![301, 302, 303, 307, 308].includes(response.status))
      return response
    const location = response.headers.get('location')
    if (!location)
      return response
    current = new URL(location, current)
  }
  throw createError({ statusCode: 422, statusMessage: '網址重新導向次數過多' })
}

async function readHtml(response: Response) {
  if (!response.body)
    return ''
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let html = ''
  while (html.length < 1_000_000) {
    const { done, value } = await reader.read()
    if (done)
      break
    html += decoder.decode(value, { stream: true })
  }
  await reader.cancel()
  return html.slice(0, 1_000_000)
}

export default defineEventHandler(async (event) => {
  const input = getQuery(event).url
  if (typeof input !== 'string' || input.length > 2048)
    throw createError({ statusCode: 400, statusMessage: '請輸入有效網址' })
  const url = normalizePublicUrl(input)
  const response = await safeFetch(url)
  const contentType = response.headers.get('content-type') || ''
  if (!response.ok || !contentType.includes('text/html'))
    throw createError({ statusCode: 422, statusMessage: '這個網址沒有可讀取的網頁資訊' })
  const html = await readHtml(response)
  const finalUrl = new URL(response.url)
  const title = meta(html, 'og:title') || html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || finalUrl.hostname
  const description = meta(html, 'og:description') || meta(html, 'description') || ''
  const imageValue = meta(html, 'og:image')
  const imageUrl = imageValue ? new URL(imageValue, finalUrl) : null
  const image = imageUrl && ['http:', 'https:'].includes(imageUrl.protocol) ? imageUrl.toString() : null
  return {
    description: decodeEntities(description.trim()).slice(0, 280),
    favicon: `${finalUrl.origin}/favicon.ico`,
    image,
    screenshot: `https://image.thum.io/get/width/1200/crop/630/noanimate/${encodeURIComponent(finalUrl.toString())}`,
    title: decodeEntities(title.trim()).slice(0, 160),
    url: finalUrl.toString(),
  }
})

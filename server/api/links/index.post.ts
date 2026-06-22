import { randomBytes } from 'node:crypto'
import { insertShortLink } from '../../utils/supabase-rest'
import { assertPublicDestination, normalizePublicUrl } from '../../utils/urls'

const attempts = new Map<string, number[]>()
const randomSlug = () => randomBytes(5).toString('base64url').slice(0, 7)

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const recent = (attempts.get(ip) || []).filter(time => now - time < 60_000)
  if (recent.length >= 10)
    throw createError({ statusCode: 429, statusMessage: '建立太頻繁，請稍後再試' })
  attempts.set(ip, [...recent, now])
  const body = await readBody<{ alias?: string, expiresInDays?: number, title?: string, url?: string }>(event)
  if (!body.url || body.url.length > 2048)
    throw createError({ statusCode: 400, statusMessage: '請輸入有效網址' })
  const target = normalizePublicUrl(body.url)
  await assertPublicDestination(target)
  const alias = body.alias?.trim().toLowerCase()
  if (alias && !/^[a-z0-9_-]{3,24}$/.test(alias))
    throw createError({ statusCode: 400, statusMessage: '自訂代碼需為 3–24 個英數字、- 或 _' })
  const days = Number(body.expiresInDays || 0)
  const expiresAt = days > 0 && days <= 365 ? new Date(now + days * 86_400_000).toISOString() : null
  try {
    const [created] = await insertShortLink({ expires_at: expiresAt, slug: alias || randomSlug(), target_url: target.toString(), title: body.title?.trim().slice(0, 160) || null })
    if (!created)
      throw createError({ statusCode: 500, statusMessage: '建立短網址失敗' })
    return { ...created, shortUrl: `${getRequestURL(event).origin}/s/${created.slug}` }
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('duplicate') || message.includes('23505'))
      throw createError({ statusCode: 409, statusMessage: '這個自訂代碼已被使用' })
    throw error
  }
})

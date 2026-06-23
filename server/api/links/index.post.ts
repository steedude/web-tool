import type { CreateLinkBody, NewShortLink } from '../../types/link.type'
import { LINK_CONFIG } from '../../configs/link.config'
import { buildShortLinkResponse, enforceCreateRateLimit, getExpiresAt, normalizeAlias, randomSlug, safeOptionalUrl, sanitizePassword, sanitizeText } from '../../utils/link.util'
import { createShortLink } from '../../utils/supabase-rest.util'
import { assertPublicDestination, normalizePublicUrl } from '../../utils/url.util'

export default defineEventHandler(async (event) => {
  const now = enforceCreateRateLimit(event)
  const body = await readBody<CreateLinkBody>(event)
  if (!body.url || body.url.length > LINK_CONFIG.maxUrlLength)
    throw createError({ statusCode: 400, statusMessage: '請輸入有效網址' })
  const target = normalizePublicUrl(body.url)
  await assertPublicDestination(target)
  const alias = normalizeAlias(body.alias)
  const days = Number(body.expiresInDays || 0)
  const payload: Omit<NewShortLink, 'slug'> = {
    description: sanitizeText(body.description, LINK_CONFIG.maxDescriptionLength),
    expires_at: getExpiresAt(days, now),
    favicon_url: safeOptionalUrl(body.favicon, target),
    image_url: safeOptionalUrl(body.image, target),
    password: sanitizePassword(body.password),
    screenshot_url: safeOptionalUrl(body.screenshot, target),
    target_url: target.toString(),
    title: sanitizeText(body.title, LINK_CONFIG.maxTitleLength),
  }

  async function createWithSlug(slug: string) {
    const created = await createShortLink({ ...payload, slug })
    return buildShortLinkResponse(event, created, Boolean(payload.password))
  }

  try {
    if (alias)
      return await createWithSlug(alias)
    for (let attempt = 0; attempt < LINK_CONFIG.maxSlugAttempts; attempt++) {
      try {
        return await createWithSlug(randomSlug())
      }
      catch (error: unknown) {
        const message = error instanceof Error ? error.message : ''
        if (!message.includes('duplicate') && !message.includes('23505'))
          throw error
      }
    }
    throw createError({ statusCode: 500, statusMessage: '建立短網址失敗，請再試一次' })
  }
  catch (error: unknown) {
    const message = error instanceof Error ? error.message : ''
    if (message.includes('duplicate') || message.includes('23505'))
      throw createError({ statusCode: 409, statusMessage: '這個自訂代碼已被使用' })
    throw error
  }
})

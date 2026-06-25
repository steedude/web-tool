import type { CreateLinkBody, NewShortLink } from '../../types/link.type'
import { ApiErrorCode } from '../../configs/error.config'
import { LINK_CONFIG } from '../../configs/link.config'
import { isDuplicateError, throwApiError } from '../../utils/error.util'
import { buildShortLinkResponse, enforceCreateRateLimit, getExpiresAt, randomSlug, safeOptionalUrl, sanitizePassword, sanitizeText } from '../../utils/link.util'
import { createShortLink } from '../../utils/supabase-rest.util'
import { parseHttpUrl } from '../../utils/url.util'

export default defineEventHandler(async (event) => {
  const now = enforceCreateRateLimit(event)
  const body = await readBody<CreateLinkBody>(event)
  if (!body.url || body.url.length > LINK_CONFIG.maxUrlLength)
    throwApiError(400, ApiErrorCode.InvalidUrl)
  const target = parseHttpUrl(body.url)
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
    for (let attempt = 0; attempt < LINK_CONFIG.maxSlugAttempts; attempt++) {
      try {
        return await createWithSlug(randomSlug())
      }
      catch (error: unknown) {
        if (!isDuplicateError(error))
          throw error
      }
    }
    throwApiError(500, ApiErrorCode.CreateLinkFailed)
  }
  catch (error: unknown) {
    if (isDuplicateError(error))
      throwApiError(500, ApiErrorCode.CreateLinkFailed)
    throw error
  }
})

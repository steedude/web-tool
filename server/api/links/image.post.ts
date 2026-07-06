import type { NewShortLink } from '../../types/link.type'
import { randomUUID } from 'node:crypto'
import { SentryFeature, SentryOperation, SentryTagKey } from '../../../sentry.shared'
import { ApiErrorCode } from '../../configs/error.config'
import { LINK_CONFIG } from '../../configs/link.config'
import { isDuplicateError, throwApiError } from '../../utils/error.util'
import { buildShortLinkResponse, enforceCreateRateLimit, getExpiresAt, randomSlug, sanitizePassword, sanitizeText } from '../../utils/link.util'
import { captureHandledServerException } from '../../utils/sentry.util'
import { createImageShortLink } from '../../utils/supabase-rest.util'
import { deletePublicImage, uploadPublicImage } from '../../utils/supabase-storage.util'

const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function extensionFor(type: string) {
  if (type === 'image/jpeg')
    return 'jpg'
  if (type === 'image/png')
    return 'png'
  if (type === 'image/webp')
    return 'webp'
  if (type === 'image/gif')
    return 'gif'
  return 'bin'
}

export default defineEventHandler(async (event) => {
  const now = enforceCreateRateLimit(event)
  let form: Awaited<ReturnType<typeof readMultipartFormData>>
  try {
    form = await readMultipartFormData(event)
  }
  catch (error: unknown) {
    const statusCode = (error as { statusCode?: number })?.statusCode
    throwApiError(statusCode === 413 ? 413 : 400, statusCode === 413 ? ApiErrorCode.RequestTooLarge : ApiErrorCode.CreateLinkFailed)
  }

  const image = form?.find(item => item.name === 'image' && item.filename)
  if (!image?.data?.byteLength)
    throwApiError(400, ApiErrorCode.ImageRequired)

  const contentType = image.type || 'application/octet-stream'
  if (!allowedTypes.has(contentType))
    throwApiError(400, ApiErrorCode.InvalidImageType)
  if (image.data.byteLength > LINK_CONFIG.maxImageUploadBytes)
    throwApiError(400, ApiErrorCode.ImageTooLarge)

  const imageData = image.data
  const field = (name: string) => form?.find(item => item.name === name)?.data.toString('utf8')
  const days = Number(field('expiresInDays') || 0)
  const title = sanitizeText(field('title'), LINK_CONFIG.maxTitleLength)
  const description = sanitizeText(field('description'), LINK_CONFIG.maxDescriptionLength)
  const expiresAt = getExpiresAt(days, now)
  const imagePassword = sanitizePassword(field('password'))

  async function createWithSlug(slug: string) {
    const path = `${slug}/${randomUUID()}.${extensionFor(contentType)}`
    let uploaded = false
    try {
      const imageUrl = await uploadPublicImage(path, imageData, contentType)
      uploaded = true
      const payload: Omit<NewShortLink, 'slug'> = {
        description,
        expires_at: expiresAt,
        favicon_url: null,
        image_url: imageUrl,
        password: null,
        screenshot_url: imageUrl,
        target_url: `${getRequestURL(event).origin}/image/${slug}`,
        title,
      }
      const created = await createImageShortLink({
        description,
        expires_at: expiresAt,
        image_url: imageUrl,
        password: imagePassword,
        slug,
        title,
      }, { ...payload, slug })
      return buildShortLinkResponse(event, created, Boolean(imagePassword))
    }
    catch (error: unknown) {
      if (uploaded) {
        try {
          await deletePublicImage(path)
        }
        catch (cleanupError: unknown) {
          // 保留原本的建立失敗錯誤；這裡只回報清理失敗，避免覆蓋主要錯誤。
          captureHandledServerException(cleanupError, {
            extra: {
              path,
            },
            tags: {
              [SentryTagKey.Feature]: SentryFeature.ImageLink,
              [SentryTagKey.Operation]: SentryOperation.StorageCleanup,
            },
          })
        }
      }
      throw error
    }
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

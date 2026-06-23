import type { NewShortLink } from '../../types/link.type'
import { randomUUID } from 'node:crypto'
import { LINK_CONFIG } from '../../configs/link.config'
import { buildShortLinkResponse, enforceCreateRateLimit, getExpiresAt, normalizeAlias, randomSlug, sanitizePassword, sanitizeText } from '../../utils/link.util'
import { createImageLink, createShortLink } from '../../utils/supabase-rest.util'
import { uploadPublicImage } from '../../utils/supabase-storage.util'

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
  const form = await readMultipartFormData(event)
  const image = form?.find(item => item.name === 'image' && item.filename)
  if (!image?.data?.byteLength)
    throw createError({ statusCode: 400, statusMessage: '請選擇要上傳的圖片' })

  const contentType = image.type || 'application/octet-stream'
  if (!allowedTypes.has(contentType))
    throw createError({ statusCode: 400, statusMessage: '目前只支援 JPG、PNG、WebP、GIF 圖片' })
  if (image.data.byteLength > LINK_CONFIG.maxImageUploadBytes)
    throw createError({ statusCode: 400, statusMessage: '圖片不能超過 5 MB' })

  const imageData = image.data
  const imageName = image.filename || 'image'
  const field = (name: string) => form?.find(item => item.name === name)?.data.toString('utf8')
  const alias = normalizeAlias(field('alias'))
  const days = Number(field('expiresInDays') || 0)
  const title = sanitizeText(field('title') || imageName, LINK_CONFIG.maxTitleLength)
  const description = sanitizeText(field('description'), LINK_CONFIG.maxDescriptionLength)
  const expiresAt = getExpiresAt(days, now)
  const imagePassword = sanitizePassword(field('password'))

  async function createWithSlug(slug: string) {
    const path = `${slug}/${randomUUID()}.${extensionFor(contentType)}`
    const imageUrl = await uploadPublicImage(path, imageData, contentType)
    await createImageLink({
      description,
      expires_at: expiresAt,
      image_url: imageUrl,
      password: imagePassword,
      slug,
      title,
    })
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
    const created = await createShortLink({ ...payload, slug })
    return buildShortLinkResponse(event, created, Boolean(imagePassword))
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
      throw createError({ statusCode: 409, statusMessage: '這個自訂代碼已經被使用' })
    throw error
  }
})

import { LINK_CONFIG, LinkResolveStatus } from '../../configs/link.config'
import { imagePage, imagePasswordPage } from '../../utils/redirect-page.util'
import { resolveImageLink } from '../../utils/supabase-rest.util'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  if (!slug || !LINK_CONFIG.aliasPattern.test(slug))
    throw createError({ statusCode: 404, statusMessage: '找不到圖片' })

  const result = await resolveImageLink(slug)
  if (!result || result.status === LinkResolveStatus.NotFound || result.status === LinkResolveStatus.Expired)
    throw createError({ statusCode: 404, statusMessage: '找不到圖片' })
  if (result.status === LinkResolveStatus.PasswordRequired)
    return send(event, imagePasswordPage(slug), 'text/html')
  if (!result.image_url)
    throw createError({ statusCode: 404, statusMessage: '找不到圖片' })

  return send(event, imagePage(result.image_url, result.title || '圖片分享', result.description || ''), 'text/html')
})

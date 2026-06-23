import { LINK_CONFIG, LinkResolveStatus } from '../../configs/link.config'
import { imagePage, imagePasswordPage } from '../../utils/redirect-page.util'
import { resolveImageLink } from '../../utils/supabase-rest.util'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  if (!slug || !LINK_CONFIG.aliasPattern.test(slug))
    throw createError({ statusCode: 404, statusMessage: '找不到圖片' })

  const body = await readBody<{ password?: string }>(event)
  const result = await resolveImageLink(slug, body.password)
  if (!result || result.status === LinkResolveStatus.NotFound || result.status === LinkResolveStatus.Expired)
    throw createError({ statusCode: 404, statusMessage: '找不到圖片' })
  if (result.status === LinkResolveStatus.PasswordRequired || !result.image_url)
    return send(event, imagePasswordPage(slug, '密碼不正確，請再試一次。'), 'text/html')

  return send(event, imagePage(result.image_url, result.title || '圖片分享', result.description || ''), 'text/html')
})

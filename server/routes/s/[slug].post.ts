import { LINK_CONFIG, LinkResolveStatus } from '../../configs/link.config'
import { passwordPage } from '../../utils/redirect-page.util'
import { linkStatusPage } from '../../utils/status-page.util'
import { resolveShortLink } from '../../utils/supabase-rest.util'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  if (!slug || !LINK_CONFIG.slugPattern.test(slug)) {
    setResponseStatus(event, 404)
    return send(event, linkStatusPage(LinkResolveStatus.NotFound), 'text/html')
  }

  const body = await readBody<{ password?: string }>(event)
  const result = await resolveShortLink(slug, body.password)
  if (!result || result.status === LinkResolveStatus.NotFound) {
    setResponseStatus(event, 404)
    return send(event, linkStatusPage(LinkResolveStatus.NotFound), 'text/html')
  }
  if (result.status === LinkResolveStatus.Expired) {
    setResponseStatus(event, 410)
    return send(event, linkStatusPage(LinkResolveStatus.Expired), 'text/html')
  }
  if (result.status === LinkResolveStatus.PasswordRequired || !result.target_url)
    return send(event, passwordPage(slug, '密碼不正確，請再試一次。'), 'text/html')

  return sendRedirect(event, result.target_url, 302)
})

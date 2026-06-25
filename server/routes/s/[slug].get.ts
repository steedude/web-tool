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
  const target = await resolveShortLink(slug)
  if (!target || target.status === LinkResolveStatus.NotFound) {
    setResponseStatus(event, 404)
    return send(event, linkStatusPage(LinkResolveStatus.NotFound), 'text/html')
  }
  if (target.status === LinkResolveStatus.Expired) {
    setResponseStatus(event, 410)
    return send(event, linkStatusPage(LinkResolveStatus.Expired), 'text/html')
  }
  if (target.status === LinkResolveStatus.PasswordRequired)
    return send(event, passwordPage(slug), 'text/html')
  if (!target.target_url) {
    setResponseStatus(event, 404)
    return send(event, linkStatusPage(LinkResolveStatus.NotFound), 'text/html')
  }
  return sendRedirect(event, target.target_url, 302)
})

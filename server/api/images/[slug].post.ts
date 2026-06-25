import { LINK_CONFIG, LinkResolveStatus } from '../../configs/link.config'
import { resolveImageLink } from '../../utils/supabase-rest.util'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  if (!slug || !LINK_CONFIG.slugPattern.test(slug)) {
    return {
      description: null,
      image_url: null,
      password_required: false,
      status: LinkResolveStatus.NotFound,
      title: null,
    }
  }

  const body = await readBody<{ password?: string }>(event)
  const result = await resolveImageLink(slug, body.password)

  if (!result) {
    return {
      description: null,
      image_url: null,
      password_required: false,
      status: LinkResolveStatus.NotFound,
      title: null,
    }
  }

  return result
})

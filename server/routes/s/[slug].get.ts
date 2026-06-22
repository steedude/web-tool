import { resolveShortLink } from '../../utils/supabase-rest'

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')?.toLowerCase()
  if (!slug || !/^[a-z0-9_-]{3,24}$/.test(slug))
    throw createError({ statusCode: 404, statusMessage: '找不到這個短網址' })
  const target = await resolveShortLink(slug)
  if (!target)
    throw createError({ statusCode: 404, statusMessage: '短網址不存在或已過期' })
  return sendRedirect(event, target, 302)
})

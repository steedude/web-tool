import type { NewImageLink, NewShortLink, ResolvedImageLink, ResolvedShortLink } from '../types/link.type'

function credentials() {
  const config = useRuntimeConfig()
  const key = config.supabaseServiceRoleKey || config.public.supabasePublishableKey
  if (!config.public.supabaseUrl || !key)
    throw createError({ statusCode: 503, statusMessage: '資料庫尚未設定' })
  return { key, url: config.public.supabaseUrl }
}

export async function createShortLink(link: NewShortLink) {
  const { key, url } = credentials()
  const [created] = await $fetch<NewShortLink[]>(`${url}/rest/v1/rpc/create_short_link`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}` },
    body: {
      link_description: link.description,
      link_expires_at: link.expires_at,
      link_favicon_url: link.favicon_url,
      link_image_url: link.image_url,
      link_password: link.password,
      link_screenshot_url: link.screenshot_url,
      link_slug: link.slug,
      link_target_url: link.target_url,
      link_title: link.title,
    },
  })
  return created ?? link
}

export async function resolveShortLink(slug: string, password?: string | null) {
  const { key, url } = credentials()
  const [result] = await $fetch<ResolvedShortLink[]>(`${url}/rest/v1/rpc/resolve_short_link`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}` },
    body: { password_attempt: password || null, requested_slug: slug },
  })
  return result ?? null
}

export async function createImageLink(link: NewImageLink) {
  const { key, url } = credentials()
  const [created] = await $fetch<NewImageLink[]>(`${url}/rest/v1/rpc/create_image_link`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}` },
    body: {
      link_description: link.description,
      link_expires_at: link.expires_at,
      link_image_url: link.image_url,
      link_password: link.password,
      link_slug: link.slug,
      link_title: link.title,
    },
  })
  return created ?? link
}

export async function resolveImageLink(slug: string, password?: string | null) {
  const { key, url } = credentials()
  const [result] = await $fetch<ResolvedImageLink[]>(`${url}/rest/v1/rpc/resolve_image_link`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}` },
    body: { password_attempt: password || null, requested_slug: slug },
  })
  return result ?? null
}

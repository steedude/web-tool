interface ShortLinkRow {
  clicks: number
  created_at: string
  expires_at: string | null
  id: string
  slug: string
  target_url: string
  title: string | null
}

function credentials() {
  const config = useRuntimeConfig()
  const key = config.supabaseServiceRoleKey || config.public.supabasePublishableKey
  if (!config.public.supabaseUrl || !key)
    throw createError({ statusCode: 503, statusMessage: '資料庫尚未設定' })
  return { key, url: config.public.supabaseUrl }
}

export async function insertShortLink(row: Pick<ShortLinkRow, 'expires_at' | 'slug' | 'target_url' | 'title'>) {
  const { key, url } = credentials()
  return await $fetch<ShortLinkRow[]>(`${url}/rest/v1/short_links`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}`, prefer: 'return=representation' },
    body: row,
  })
}

export async function resolveShortLink(slug: string) {
  const { key, url } = credentials()
  const rows = await $fetch<Array<{ target_url: string }>>(`${url}/rest/v1/rpc/resolve_short_link`, {
    method: 'POST',
    headers: { apikey: key, authorization: `Bearer ${key}` },
    body: { requested_slug: slug },
  })
  return rows[0]?.target_url ?? null
}

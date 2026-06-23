import type { H3Event } from 'h3'
import type { NewShortLink, ShortLinkResponse } from '../types/link.type'
import { randomBytes } from 'node:crypto'
import { LINK_CONFIG, LinkExpiryDay } from '../configs/link.config'

const attempts = new Map<string, number[]>()

export function randomSlug() {
  return randomBytes(LINK_CONFIG.slugBytes).toString('base64url').slice(0, LINK_CONFIG.slugLength)
}

export function normalizeAlias(alias: string | undefined) {
  const value = alias?.trim().toLowerCase()
  if (!value)
    return null
  if (!LINK_CONFIG.aliasPattern.test(value))
    throw createError({ statusCode: 400, statusMessage: '自訂代碼需為 3–24 個英數字、- 或 _' })
  return value
}

export function getExpiresAt(days: number, now = Date.now()) {
  if (days === LinkExpiryDay.Forever)
    return null
  if (![LinkExpiryDay.OneDay, LinkExpiryDay.OneWeek, LinkExpiryDay.OneMonth, LinkExpiryDay.OneYear].includes(days))
    return null
  return new Date(now + days * 86_400_000).toISOString()
}

export function sanitizeText(value: string | undefined, maxLength: number) {
  return value?.trim().slice(0, maxLength) || null
}

export function sanitizePassword(value: string | undefined) {
  const password = value?.trim()
  if (!password)
    return null
  if (password.length < 4)
    throw createError({ statusCode: 400, statusMessage: '密碼至少需要 4 個字元' })
  if (password.length > LINK_CONFIG.maxPasswordLength)
    throw createError({ statusCode: 400, statusMessage: '密碼太長了' })
  return password
}

export function safeOptionalUrl(value: string | null | undefined, baseUrl: URL) {
  if (!value)
    return null
  try {
    const url = new URL(value, baseUrl)
    return ['http:', 'https:'].includes(url.protocol) ? url.toString().slice(0, LINK_CONFIG.maxUrlLength) : null
  }
  catch {
    return null
  }
}

export function enforceCreateRateLimit(event: H3Event) {
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  const recent = (attempts.get(ip) || []).filter(time => now - time < LINK_CONFIG.rateLimit.windowMs)
  if (recent.length >= LINK_CONFIG.rateLimit.maxAttempts)
    throw createError({ statusCode: 429, statusMessage: '建立太頻繁，請稍後再試' })
  attempts.set(ip, [...recent, now])
  return now
}

export function buildShortLinkResponse(event: H3Event, link: NewShortLink, passwordRequired = Boolean(link.password)): ShortLinkResponse {
  return {
    description: link.description,
    expires_at: link.expires_at,
    favicon_url: link.favicon_url,
    image_url: link.image_url,
    password_required: passwordRequired,
    screenshot_url: link.screenshot_url,
    shortUrl: `${getRequestURL(event).origin}/s/${link.slug}`,
    slug: link.slug,
    target_url: link.target_url,
    title: link.title,
  }
}

export function buildScreenshotUrl(url: URL) {
  return `${LINK_CONFIG.screenshot.provider}/width/${LINK_CONFIG.screenshot.width}/crop/${LINK_CONFIG.screenshot.height}/noanimate/${encodeURIComponent(url.toString())}`
}

export function decodeHtmlEntities(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, String.fromCharCode(39))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}

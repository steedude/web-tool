import type { H3Event } from 'h3'
import type { NewShortLink, ShortLinkResponse } from '../types/link.type'
import { randomBytes } from 'node:crypto'
import { ApiErrorCode } from '../configs/error.config'
import { LINK_CONFIG, LinkExpiryDay } from '../configs/link.config'
import { throwApiError } from './error.util'

const attempts = new Map<string, number[]>()

export function randomSlug() {
  return randomBytes(LINK_CONFIG.slugBytes).toString('base64url').slice(0, LINK_CONFIG.slugLength)
}

export function getExpiresAt(days: number, now = Date.now()) {
  if (days === LinkExpiryDay.Forever)
    return null
  if (![LinkExpiryDay.OneDay, LinkExpiryDay.OneWeek, LinkExpiryDay.OneMonth].includes(days))
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
    throwApiError(400, ApiErrorCode.PasswordTooShort)
  if (password.length > LINK_CONFIG.maxPasswordLength)
    throwApiError(400, ApiErrorCode.PasswordTooLong)
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
  // Serverless instances may reset this in-memory map, but it still prevents rapid repeated clicks
  // on the same warm instance without introducing another database table.
  const recent = (attempts.get(ip) || []).filter(time => now - time < LINK_CONFIG.rateLimit.windowMs)
  if (recent.length >= LINK_CONFIG.rateLimit.maxAttempts)
    throwApiError(429, ApiErrorCode.RateLimited)
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

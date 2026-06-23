import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { ApiErrorCode } from '../configs/error.config'
import { throwApiError } from './error.util'

function isPrivateIp(address: string) {
  if (address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:'))
    return true
  if (isIP(address) !== 4)
    return false
  const [a, b = 0] = address.split('.').map(Number)
  return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0
}

export function normalizePublicUrl(input: string) {
  const value = input.trim()
  const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
  if (!['http:', 'https:'].includes(url.protocol))
    throwApiError(400, ApiErrorCode.UnsupportedUrlProtocol)
  if (url.username || url.password)
    throwApiError(400, ApiErrorCode.UrlContainsCredentials)
  return url
}

export function parseHttpUrl(input: string) {
  let url: URL
  try {
    url = new URL(input.trim())
  }
  catch {
    throwApiError(400, ApiErrorCode.InvalidUrl)
  }
  if (!['http:', 'https:'].includes(url.protocol))
    throwApiError(400, ApiErrorCode.UnsupportedUrlProtocol)
  return url
}

export async function assertPublicDestination(url: URL) {
  if (url.hostname === 'localhost' || url.hostname.endsWith('.local'))
    throwApiError(400, ApiErrorCode.UnsafeInternalUrl)
  const addresses = await lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some(item => isPrivateIp(item.address)))
    throwApiError(400, ApiErrorCode.UnsafeInternalUrl)
}

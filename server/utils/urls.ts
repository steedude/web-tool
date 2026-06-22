import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

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
    throw createError({ statusCode: 400, statusMessage: '只支援 HTTP 或 HTTPS 網址' })
  if (url.username || url.password)
    throw createError({ statusCode: 400, statusMessage: '網址不可包含帳號密碼' })
  return url
}

export async function assertPublicDestination(url: URL) {
  if (url.hostname === 'localhost' || url.hostname.endsWith('.local'))
    throw createError({ statusCode: 400, statusMessage: '不可存取內部網址' })
  const addresses = await lookup(url.hostname, { all: true })
  if (!addresses.length || addresses.some(item => isPrivateIp(item.address)))
    throw createError({ statusCode: 400, statusMessage: '不可存取內部網址' })
}

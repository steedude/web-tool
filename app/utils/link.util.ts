import { LINK_SCREENSHOT_CONFIG } from '~/configs/link.config'

export function getHostname(value: string) {
  try {
    return new URL(value).hostname
  }
  catch {
    return ''
  }
}

export function getPreviewImage(image?: string | null, screenshot?: string | null) {
  return screenshot || image || ''
}

export function getWebsiteScreenshotUrl(value: string) {
  try {
    const url = new URL(value)
    return `${LINK_SCREENSHOT_CONFIG.provider}/?url=${encodeURIComponent(url.toString())}&screenshot=true&meta=false&embed=screenshot.url`
  }
  catch {
    return ''
  }
}

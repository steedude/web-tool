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

export function getCharacterCount(value: string, maxLength: number) {
  return `${value.length}/${maxLength}`
}

export function getWebsiteScreenshotUrl(value: string) {
  try {
    const url = new URL(value)
    // Microlink 只當作前端圖片來源。後端仍然只負責儲存網址，
    // 建立短網址時不會 fetch 使用者提供的任意頁面。
    return `${LINK_SCREENSHOT_CONFIG.provider}/?url=${encodeURIComponent(url.toString())}&screenshot=true&meta=false&embed=screenshot.url`
  }
  catch {
    return ''
  }
}

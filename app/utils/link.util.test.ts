import { describe, expect, it } from 'vitest'
import { LINK_SCREENSHOT_CONFIG } from '~/configs/link.config'
import { getHostname, getPreviewImage, getWebsiteScreenshotUrl } from './link.util'

describe('link utilities', () => {
  it('extracts hostnames from valid URLs only', () => {
    expect(getHostname('https://example.com/path')).toBe('example.com')
    expect(getHostname('not a url')).toBe('')
  })

  it('prefers screenshots over fallback images', () => {
    expect(getPreviewImage('https://example.com/image.png', 'https://example.com/screenshot.png')).toBe('https://example.com/screenshot.png')
    expect(getPreviewImage('https://example.com/image.png', null)).toBe('https://example.com/image.png')
  })

  it('builds a client-side Microlink screenshot URL without fetching from the server', () => {
    const screenshotUrl = getWebsiteScreenshotUrl('https://example.com/article')

    expect(screenshotUrl).toContain(LINK_SCREENSHOT_CONFIG.provider)
    expect(screenshotUrl).toContain('screenshot=true')
    expect(screenshotUrl).toContain(encodeURIComponent('https://example.com/article'))
  })
})

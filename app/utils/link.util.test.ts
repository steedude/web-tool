import { describe, expect, it } from 'vitest'
import { LINK_SCREENSHOT_CONFIG, LinkMode } from '~/configs/link.config'
import { getCharacterCount, getCreatedLinkPreview, getHostname, getPreviewImage, getWebsiteScreenshotUrl } from './link.util'

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

  it('formats text length counters', () => {
    expect(getCharacterCount('hello', 20)).toBe('5/20')
  })
})

describe('created link previews', () => {
  const link = {
    description: null,
    expires_at: null,
    favicon_url: null,
    image_url: 'https://storage.example/picture.png',
    password_required: false,
    screenshot_url: null,
    shortUrl: 'https://example.com/s/abc123',
    slug: 'abc123',
    target_url: 'https://other.example/image/article',
    title: null,
  }

  it('uses the creation mode instead of guessing from the URL path', () => {
    expect(getCreatedLinkPreview({ ...link, mode: LinkMode.Url })).toContain(LINK_SCREENSHOT_CONFIG.provider)
    expect(getCreatedLinkPreview({ ...link, mode: LinkMode.Image })).toBe(link.image_url)
  })
})

export enum LinkExpiryDay {
  Forever = 0,
  OneDay = 1,
  OneWeek = 7,
  OneMonth = 30,
}

export enum LinkResolveStatus {
  Expired = 'expired',
  NotFound = 'not_found',
  PasswordRequired = 'password_required',
  Resolved = 'resolved',
}

export const LINK_CONFIG = {
  aliasPattern: /^[a-z0-9_-]{3,24}$/,
  htmlPreviewMaxBytes: 1_000_000,
  maxDescriptionLength: 100,
  maxImageUploadBytes: 5 * 1024 * 1024,
  maxPasswordLength: 16,
  maxRedirects: 4,
  maxSlugAttempts: 4,
  maxTitleLength: 50,
  maxUrlLength: 2048,
  previewTimeoutMs: 8000,
  rateLimit: {
    maxAttempts: 10,
    windowMs: 60_000,
  },
  screenshot: {
    height: 630,
    provider: 'https://api.microlink.io',
    width: 1200,
  },
  slugBytes: 5,
  slugLength: 7,
  storage: {
    imageBucket: 'link-images',
  },
} as const

export const LINK_PREVIEW_USER_AGENT = 'Mozilla/5.0 (compatible; WebLabPreview/1.0)'

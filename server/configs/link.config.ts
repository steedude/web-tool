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
  maxDescriptionLength: 50,
  maxImageUploadBytes: 5 * 1024 * 1024,
  maxPasswordLength: 16,
  maxSlugAttempts: 4,
  maxTitleLength: 20,
  maxUrlLength: 2048,
  rateLimit: {
    maxAttempts: 10,
    windowMs: 60_000,
  },
  slugBytes: 5,
  slugLength: 7,
  storage: {
    imageBucket: 'link-images',
  },
} as const

import { LINK_FORM_LIMITS } from '../../shared/configs/link.config'

export { LinkExpiryDay, LinkResolveStatus } from '../../shared/configs/link.config'

export const LINK_CONFIG = {
  maxDescriptionLength: LINK_FORM_LIMITS.description,
  maxImageUploadBytes: LINK_FORM_LIMITS.imageBytes,
  maxPasswordLength: LINK_FORM_LIMITS.password,
  minPasswordLength: LINK_FORM_LIMITS.minPassword,
  maxSlugAttempts: 4,
  maxTitleLength: LINK_FORM_LIMITS.title,
  maxUrlLength: LINK_FORM_LIMITS.url,
  rateLimit: {
    maxAttempts: 10,
    windowMs: 60_000,
  },
  slugBytes: 5,
  slugLength: 7,
  slugPattern: /^[a-z0-9_-]{3,24}$/,
  storage: {
    imageBucket: 'link-images',
  },
} as const

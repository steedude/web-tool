export { LINK_FORM_LIMITS, LINK_IMAGE_UPLOAD_TYPES, LinkExpiryDay, LinkMode, LinkResolveStatus } from '#shared/configs/link.config'

export const LINK_QR_CONFIG = {
  color: {
    dark: '#171714',
    light: '#ffffff',
  },
  margin: 1,
  width: 360,
} as const

export const LINK_SCREENSHOT_CONFIG = {
  provider: 'https://api.microlink.io',
} as const

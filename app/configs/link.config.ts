export enum LinkExpiryDay {
  Forever = 0,
  OneDay = 1,
  OneWeek = 7,
  OneMonth = 30,
}

export const LINK_EXPIRY_OPTIONS = [
  { labelKey: 'links.expiry.forever', value: LinkExpiryDay.Forever },
  { labelKey: 'links.expiry.oneDay', value: LinkExpiryDay.OneDay },
  { labelKey: 'links.expiry.oneWeek', value: LinkExpiryDay.OneWeek },
  { labelKey: 'links.expiry.oneMonth', value: LinkExpiryDay.OneMonth },
] as const

export const LINK_QR_CONFIG = {
  color: {
    dark: '#171714',
    light: '#ffffff',
  },
  margin: 1,
  width: 360,
} as const

export const LINK_FORM_LIMITS = {
  description: 50,
  password: 16,
  title: 20,
} as const

export const LINK_SCREENSHOT_CONFIG = {
  provider: 'https://api.microlink.io',
} as const

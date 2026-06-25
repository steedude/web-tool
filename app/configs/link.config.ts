/** 短網址與圖片分享頁的有效期限選項，數字代表天數。 */
export enum LinkExpiryDay {
  /** 永久有效，不設定過期時間。 */
  Forever = 0,
  /** 一天後過期。 */
  OneDay = 1,
  /** 一週後過期。 */
  OneWeek = 7,
  /** 一個月後過期。 */
  OneMonth = 30,
}

type Translate = (key: string) => string

export function createLinkExpiryOptions(t: Translate) {
  return [
    { label: t('links.expiry.forever'), value: LinkExpiryDay.Forever },
    { label: t('links.expiry.oneDay'), value: LinkExpiryDay.OneDay },
    { label: t('links.expiry.oneWeek'), value: LinkExpiryDay.OneWeek },
    { label: t('links.expiry.oneMonth'), value: LinkExpiryDay.OneMonth },
  ]
}

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
  imageBytes: 5 * 1024 * 1024,
  password: 16,
  title: 20,
} as const

export const LINK_IMAGE_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export const LINK_SCREENSHOT_CONFIG = {
  provider: 'https://api.microlink.io',
} as const

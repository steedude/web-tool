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

/** 建立連結表單可選的模式。 */
export enum LinkMode {
  /** 建立可分享的圖片頁面與對應短連結。 */
  Image = 'image',
  /** 建立導向外部網址的短連結。 */
  Url = 'url',
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

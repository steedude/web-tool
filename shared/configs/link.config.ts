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

/** 後端解析短網址或圖片連結時回傳給前端的狀態。 */
export enum LinkResolveStatus {
  /** 連結存在，但已超過有效期限。 */
  Expired = 'expired',
  /** 找不到這個代碼。 */
  NotFound = 'not_found',
  /** 連結需要密碼才能取得內容。 */
  PasswordRequired = 'password_required',
  /** 連結成功解析，可以顯示或導向。 */
  Resolved = 'resolved',
}

export const LINK_FORM_LIMITS = {
  description: 50,
  imageBytes: 5 * 1024 * 1024,
  password: 16,
  minPassword: 4,
  url: 2048,
  title: 20,
} as const

export const LINK_IMAGE_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

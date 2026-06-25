/** 後端建立連結時可接受的有效期限，數字代表天數。 */
export enum LinkExpiryDay {
  /** 永久有效，不寫入過期時間。 */
  Forever = 0,
  /** 一天後過期。 */
  OneDay = 1,
  /** 一週後過期。 */
  OneWeek = 7,
  /** 一個月後過期。 */
  OneMonth = 30,
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

export const LINK_CONFIG = {
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
  slugPattern: /^[a-z0-9_-]{3,24}$/,
  storage: {
    imageBucket: 'link-images',
  },
} as const

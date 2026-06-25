/** API 統一錯誤代碼，前端會依代碼轉成對應的翻譯文案。 */
export enum ApiErrorCode {
  /** 自訂短碼已被使用。 */
  AliasTaken = 'ALIAS_TAKEN',
  /** 建立短網址或圖片分享頁失敗。 */
  CreateLinkFailed = 'CREATE_LINK_FAILED',
  /** Supabase 資料庫尚未設定。 */
  DatabaseNotConfigured = 'DATABASE_NOT_CONFIGURED',
  /** 建立圖片分享頁時沒有上傳圖片。 */
  ImageRequired = 'IMAGE_REQUIRED',
  /** 圖片超過單檔大小限制。 */
  ImageTooLarge = 'IMAGE_TOO_LARGE',
  /** 圖片上傳到 Storage 失敗。 */
  ImageUploadFailed = 'IMAGE_UPLOAD_FAILED',
  /** 自訂短碼格式不合法。 */
  InvalidAlias = 'INVALID_ALIAS',
  /** 圖片 MIME type 不在允許清單內。 */
  InvalidImageType = 'INVALID_IMAGE_TYPE',
  /** URL 格式不合法。 */
  InvalidUrl = 'INVALID_URL',
  /** 密碼超過長度上限。 */
  PasswordTooLong = 'PASSWORD_TOO_LONG',
  /** 密碼短於最低長度限制。 */
  PasswordTooShort = 'PASSWORD_TOO_SHORT',
  /** 請求太頻繁，觸發簡易 rate limit。 */
  RateLimited = 'RATE_LIMITED',
  /** 請求內容超過後端可接受大小。 */
  RequestTooLarge = 'REQUEST_TOO_LARGE',
  /** Supabase Storage 尚未設定。 */
  StorageNotConfigured = 'STORAGE_NOT_CONFIGURED',
  /** URL 協定不是 HTTP 或 HTTPS。 */
  UnsupportedUrlProtocol = 'UNSUPPORTED_URL_PROTOCOL',
}

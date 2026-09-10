/** 前端會接到或自行產生的 API 錯誤代碼。 */
export enum ApiErrorCode {
  /** 建立連結流程失敗，但沒有更精準的錯誤原因。 */
  CreateLinkFailed = 'CREATE_LINK_FAILED',
  /** Supabase Database 尚未設定。 */
  DatabaseNotConfigured = 'DATABASE_NOT_CONFIGURED',
  /** 圖片分享沒有收到圖片檔案。 */
  ImageRequired = 'IMAGE_REQUIRED',
  /** 圖片檔案超過系統限制。 */
  ImageTooLarge = 'IMAGE_TOO_LARGE',
  /** 圖片上傳到 Storage 失敗。 */
  ImageUploadFailed = 'IMAGE_UPLOAD_FAILED',
  /** 圖片格式不在允許清單內。 */
  InvalidImageType = 'INVALID_IMAGE_TYPE',
  /** URL 格式不正確。 */
  InvalidUrl = 'INVALID_URL',
  /** 密碼超過系統限制。 */
  PasswordTooLong = 'PASSWORD_TOO_LONG',
  /** 密碼短於系統限制。 */
  PasswordTooShort = 'PASSWORD_TOO_SHORT',
  /** 使用者建立太頻繁，觸發 rate limit。 */
  RateLimited = 'RATE_LIMITED',
  /** 請求內容超過後端可接受大小。 */
  RequestTooLarge = 'REQUEST_TOO_LARGE',
  /** Supabase Storage 尚未設定。 */
  StorageNotConfigured = 'STORAGE_NOT_CONFIGURED',
  /** URL 協定不是 http 或 https。 */
  UnsupportedUrlProtocol = 'UNSUPPORTED_URL_PROTOCOL',
}

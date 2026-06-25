/** 連結工具目前使用的建立模式。 */
export enum LinkMode {
  /** 建立圖片分享頁。 */
  Image = 'image',
  /** 建立短網址。 */
  Url = 'url',
}

export interface CreatedLink {
  description: string | null
  expires_at: string | null
  favicon_url: string | null
  image_url: string | null
  password_required: boolean
  screenshot_url: string | null
  shortUrl: string
  slug: string
  target_url: string
  title: string | null
}

export interface ImageLinkResolve {
  description: string | null
  image_url: string | null
  password_required: boolean
  status: 'expired' | 'not_found' | 'password_required' | 'resolved'
  title: string | null
}

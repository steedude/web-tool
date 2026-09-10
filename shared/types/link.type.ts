import type { LinkResolveStatus } from '../configs/link.config'

export interface CreateLinkBody {
  description?: string
  expiresInDays?: number
  favicon?: string
  image?: string | null
  password?: string
  screenshot?: string
  title?: string
  url?: string
}

export interface NewShortLink {
  description: string | null
  expires_at: string | null
  favicon_url: string | null
  image_url: string | null
  password: string | null
  screenshot_url: string | null
  slug: string
  target_url: string
  title: string | null
}

export interface ResolvedShortLink {
  password_required: boolean
  status: LinkResolveStatus
  target_url: string | null
}

export interface ShortLinkResponse extends Omit<NewShortLink, 'password'> {
  password_required: boolean
  shortUrl: string
}

export interface NewImageLink {
  description: string | null
  expires_at: string | null
  image_url: string
  password: string | null
  slug: string
  title: string | null
}

export interface ResolvedImageLink {
  description: string | null
  image_url: string | null
  password_required: boolean
  status: LinkResolveStatus
  title: string | null
}

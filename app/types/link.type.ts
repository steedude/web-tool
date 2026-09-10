import type { ShortLinkResponse } from '#shared/types/link.type'
import type { LinkExpiryDay, LinkMode } from '~/configs/link.config'

export type { ResolvedImageLink as ImageLinkResolve } from '#shared/types/link.type'

export interface CreatedLink extends ShortLinkResponse {
  mode: LinkMode
}

export interface LinkCreateFormPayload {
  expiresInDays: LinkExpiryDay
  image: File | null
  imageDescription: string
  imageTitle: string
  mode: LinkMode
  password: string
  url: string
}

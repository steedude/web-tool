import { SentryFeature, SentryOperation, SentryTagKey } from '../../sentry.shared'
import { ApiErrorCode } from '../configs/error.config'
import { LINK_CONFIG } from '../configs/link.config'
import { throwApiError } from './error.util'
import { captureHandledServerException } from './sentry.util'

function storageCredentials() {
  const config = useRuntimeConfig()
  const key = config.supabaseServiceRoleKey || config.public.supabasePublishableKey
  if (!config.public.supabaseUrl || !key)
    throwApiError(503, ApiErrorCode.StorageNotConfigured)
  return { key, url: config.public.supabaseUrl }
}

export function publicStorageUrl(path: string) {
  const { url } = storageCredentials()
  return `${url}/storage/v1/object/public/${LINK_CONFIG.storage.imageBucket}/${path}`
}

export async function uploadPublicImage(path: string, data: Uint8Array, contentType: string) {
  const { key, url } = storageCredentials()
  try {
    await $fetch(`${url}/storage/v1/object/${LINK_CONFIG.storage.imageBucket}/${path}`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'authorization': `Bearer ${key}`,
        'cache-control': '31536000',
        'content-type': contentType,
        'x-upsert': 'false',
      },
      body: data,
    })
  }
  catch (error: unknown) {
    captureHandledServerException(error, {
      extra: {
        bucket: LINK_CONFIG.storage.imageBucket,
        contentType,
        size: data.byteLength,
      },
      tags: {
        [SentryTagKey.Feature]: SentryFeature.ImageLink,
        [SentryTagKey.Operation]: SentryOperation.StorageUpload,
      },
    })
    throwApiError(502, ApiErrorCode.ImageUploadFailed)
  }
  return publicStorageUrl(path)
}

export async function deletePublicImage(path: string) {
  const { key, url } = storageCredentials()
  await $fetch(`${url}/storage/v1/object/${LINK_CONFIG.storage.imageBucket}/${path}`, {
    method: 'DELETE',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
    },
  })
}

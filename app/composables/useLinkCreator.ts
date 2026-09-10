import type { ShortLinkResponse } from '#shared/types/link.type'
import type { CreatedLink, LinkCreateFormPayload } from '~/types/link.type'
import { ApiErrorCode } from '~/configs/error.config'
import { LINK_FORM_LIMITS, LINK_IMAGE_UPLOAD_TYPES, LINK_QR_CONFIG, LinkMode } from '~/configs/link.config'
import { createLocalApiError } from '~/utils/error.util'
import { getCreatedLinkPreview } from '~/utils/link.util'

export function useLinkCreator() {
  const getApiErrorMessage = useApiErrorMessage()
  const created = ref<CreatedLink | null>(null)
  const creating = ref(false)
  const errorMessage = ref('')
  const { copied, copy, copyFailed, reset: resetCopy } = useCopyFeedback()
  const { qrCode, qrFailed, retryQrCode } = useQrCode(() => created.value?.shortUrl || '', LINK_QR_CONFIG)
  let revision = 0
  const createdPreviewFailed = ref(false)

  const createdPreviewImage = computed(() => created.value ? getCreatedLinkPreview(created.value) : '')
  const shouldShowCreatedPreviewImage = computed(() => Boolean(createdPreviewImage.value && !createdPreviewFailed.value))

  async function createLink(payload: LinkCreateFormPayload) {
    if (creating.value)
      return
    const currentRevision = revision
    creating.value = true
    errorMessage.value = ''
    try {
      createdPreviewFailed.value = false
      const result = payload.mode === LinkMode.Url
        ? await createUrlLink(payload)
        : await createImageLink(payload)

      if (currentRevision === revision)
        created.value = { ...result, mode: payload.mode }
    }
    catch (error: unknown) {
      if (currentRevision === revision)
        errorMessage.value = getApiErrorMessage(error, ApiErrorCode.CreateLinkFailed)
    }
    finally {
      creating.value = false
    }
  }

  function copyShortUrl() {
    return copy(created.value?.shortUrl || '')
  }

  function markPreviewFailed() {
    createdPreviewFailed.value = true
  }

  function resetResult() {
    created.value = null
    revision += 1
    resetCopy()
    createdPreviewFailed.value = false
    errorMessage.value = ''
  }

  function limitText(value: string, maxLength: number) {
    return value.trim().slice(0, maxLength)
  }

  function isValidHttpUrlInput(value: string) {
    try {
      const candidate = new URL(value.trim())
      return ['http:', 'https:'].includes(candidate.protocol)
    }
    catch {
      return false
    }
  }

  async function createUrlLink(payload: LinkCreateFormPayload) {
    if (!isValidHttpUrlInput(payload.url)) {
      throw createLocalApiError(ApiErrorCode.InvalidUrl)
    }

    return $fetch<ShortLinkResponse>('/api/links', {
      method: 'POST',
      body: {
        expiresInDays: payload.expiresInDays,
        password: limitText(payload.password, LINK_FORM_LIMITS.password) || undefined,
        url: payload.url.trim(),
      },
    })
  }

  async function createImageLink(payload: LinkCreateFormPayload) {
    if (!payload.image)
      throw createLocalApiError(ApiErrorCode.ImageRequired)
    validateImage(payload.image)

    const body = new FormData()
    body.append('image', payload.image)
    body.append('password', limitText(payload.password, LINK_FORM_LIMITS.password))
    body.append('title', limitText(payload.imageTitle, LINK_FORM_LIMITS.title))
    body.append('description', limitText(payload.imageDescription, LINK_FORM_LIMITS.description))
    body.append('expiresInDays', String(payload.expiresInDays))
    return $fetch<ShortLinkResponse>('/api/links/image', {
      method: 'POST',
      body,
    })
  }

  function validateImage(file: File) {
    if (!LINK_IMAGE_UPLOAD_TYPES.has(file.type))
      throw createLocalApiError(ApiErrorCode.InvalidImageType)
    if (file.size > LINK_FORM_LIMITS.imageBytes)
      throw createLocalApiError(ApiErrorCode.ImageTooLarge)
  }

  return {
    copied,
    copyShortUrl,
    copyFailed,
    createLink,
    created,
    createdPreviewImage,
    creating,
    errorMessage,
    markPreviewFailed,
    qrCode,
    qrFailed,
    retryQrCode,
    resetResult,
    shouldShowCreatedPreviewImage,
  }
}

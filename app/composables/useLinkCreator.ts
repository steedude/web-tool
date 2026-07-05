import type { CreatedLink, LinkCreateFormPayload } from '~/types/link.type'
import QRCode from 'qrcode'
import { ApiErrorCode } from '~/configs/error.config'
import { LINK_FORM_LIMITS, LINK_IMAGE_UPLOAD_TYPES, LINK_QR_CONFIG, LinkMode } from '~/configs/link.config'
import { createLocalApiError } from '~/utils/error.util'
import { getWebsiteScreenshotUrl } from '~/utils/link.util'

export function useLinkCreator() {
  const getApiErrorMessage = useApiErrorMessage()
  const created = ref<CreatedLink | null>(null)
  const qrCode = ref('')
  const creating = ref(false)
  const errorMessage = ref('')
  const copied = ref(false)
  const createdPreviewFailed = ref(false)

  const createdIsImage = computed(() => Boolean(created.value?.target_url.includes('/image/')))
  const createdPreviewImage = computed(() => {
    const link = created.value
    if (!link)
      return ''

    if (createdIsImage.value)
      return link.image_url || ''

    return getWebsiteScreenshotUrl(link.target_url)
  })
  const shouldShowCreatedPreviewImage = computed(() => Boolean(createdPreviewImage.value && !createdPreviewFailed.value))

  async function createLink(payload: LinkCreateFormPayload) {
    creating.value = true
    errorMessage.value = ''
    try {
      createdPreviewFailed.value = false
      if (payload.mode === LinkMode.Url)
        await createUrlLink(payload)
      else
        await createImageLink(payload)

      if (created.value)
        qrCode.value = await QRCode.toDataURL(created.value.shortUrl, LINK_QR_CONFIG)
    }
    catch (error: any) {
      errorMessage.value = getApiErrorMessage(error, ApiErrorCode.CreateLinkFailed)
    }
    finally {
      creating.value = false
    }
  }

  async function copyShortUrl() {
    if (!created.value)
      return
    await navigator.clipboard.writeText(created.value.shortUrl)
    copied.value = true
    setTimeout(() => copied.value = false, 1500)
  }

  function markPreviewFailed() {
    createdPreviewFailed.value = true
  }

  function resetResult() {
    created.value = null
    qrCode.value = ''
    copied.value = false
    createdPreviewFailed.value = false
    errorMessage.value = ''
  }

  return {
    copied,
    copyShortUrl,
    createLink,
    created,
    createdPreviewImage,
    creating,
    errorMessage,
    markPreviewFailed,
    qrCode,
    resetResult,
    shouldShowCreatedPreviewImage,
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
      errorMessage.value = getApiErrorMessage(createLocalApiError(ApiErrorCode.InvalidUrl))
      return
    }

    created.value = await $fetch<CreatedLink>('/api/links', {
      method: 'POST',
      body: {
        expiresInDays: payload.expiresInDays,
        password: limitText(payload.password, LINK_FORM_LIMITS.password) || undefined,
        url: payload.url.trim(),
      },
    })
  }

  async function createImageLink(payload: LinkCreateFormPayload) {
    if (!payload.image || !validateImage(payload.image))
      return

    const body = new FormData()
    body.append('image', payload.image)
    body.append('password', limitText(payload.password, LINK_FORM_LIMITS.password))
    body.append('title', limitText(payload.imageTitle, LINK_FORM_LIMITS.title))
    body.append('description', limitText(payload.imageDescription, LINK_FORM_LIMITS.description))
    body.append('expiresInDays', String(payload.expiresInDays))
    created.value = await $fetch<CreatedLink>('/api/links/image', {
      method: 'POST',
      body,
    })
  }

  function validateImage(file: File | null) {
    if (!file)
      return true
    if (!LINK_IMAGE_UPLOAD_TYPES.has(file.type)) {
      errorMessage.value = getApiErrorMessage(createLocalApiError(ApiErrorCode.InvalidImageType))
      return false
    }
    if (file.size > LINK_FORM_LIMITS.imageBytes) {
      errorMessage.value = getApiErrorMessage(createLocalApiError(ApiErrorCode.ImageTooLarge))
      return false
    }
    return true
  }
}

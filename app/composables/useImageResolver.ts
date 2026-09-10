import type { ImageLinkResolve } from '~/types/link.type'
import { computed, onScopeDispose, ref } from 'vue'

export function useImageResolver(slug: Ref<string>) {
  const image = ref<ImageLinkResolve | null>(null)
  const loading = ref(true)
  const errorMessage = ref('')
  const getApiErrorMessage = useApiErrorMessage()
  let request = 0

  const needsPassword = computed(() => image.value?.status === 'password_required')
  const resolvedImage = computed(() => image.value?.status === 'resolved' && image.value.image_url ? image.value : null)
  const loadFailed = computed(() => !image.value && Boolean(errorMessage.value))

  async function resolveImage(password = '') {
    const currentRequest = ++request
    const currentSlug = slug.value
    loading.value = true
    errorMessage.value = ''
    try {
      const result = await $fetch<ImageLinkResolve>(`/api/images/${currentSlug}`, {
        method: 'POST',
        body: { password: password || undefined },
      })
      if (currentRequest !== request || currentSlug !== slug.value)
        return false
      image.value = result
      return true
    }
    catch (error: unknown) {
      if (currentRequest === request)
        errorMessage.value = getApiErrorMessage(error)
      return false
    }
    finally {
      if (currentRequest === request)
        loading.value = false
    }
  }

  onScopeDispose(() => request += 1)
  return { errorMessage, image, loadFailed, loading, needsPassword, resolvedImage, resolveImage }
}

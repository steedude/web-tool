import type { QRCodeToDataURLOptions } from 'qrcode'
import { onScopeDispose, ref, toValue, watch } from 'vue'

export function useQrCode(url: MaybeRefOrGetter<string>, options: QRCodeToDataURLOptions) {
  const qrCode = ref('')
  const qrFailed = ref(false)
  let generation = 0

  async function generate(value: string) {
    const currentGeneration = ++generation
    qrCode.value = ''
    qrFailed.value = false
    if (!value || !import.meta.client)
      return

    try {
      const { default: QRCode } = await import('qrcode')
      const image = await QRCode.toDataURL(value, options)
      if (currentGeneration === generation)
        qrCode.value = image
    }
    catch {
      if (currentGeneration === generation)
        qrFailed.value = true
    }
  }

  watch(() => toValue(url), generate, { immediate: true })
  onScopeDispose(() => generation += 1)

  return { qrCode, qrFailed, retryQrCode: () => generate(toValue(url)) }
}

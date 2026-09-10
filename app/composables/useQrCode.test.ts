import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useQrCode } from './useQrCode'

const { toDataURL } = vi.hoisted(() => ({ toDataURL: vi.fn() }))
vi.mock('qrcode', () => ({ default: { toDataURL } }))
afterEach(() => toDataURL.mockReset())

describe('qr generation', () => {
  it('offers retry when generation fails without changing the shared URL', async () => {
    toDataURL.mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce('data:image/png;retry')
    const url = ref('https://example.com/en/drop?room=ABC123')
    const scope = effectScope()
    const qr = scope.run(() => useQrCode(url, { width: 320 }))!
    await vi.dynamicImportSettled()
    expect(qr.qrFailed.value).toBe(true)
    expect(url.value).toContain('/en/drop?room=ABC123')
    await qr.retryQrCode()
    expect(qr.qrCode.value).toBe('data:image/png;retry')
    expect(qr.qrFailed.value).toBe(false)
    scope.stop()
  })

  it('does not let an older request replace a newer QR code', async () => {
    let finish!: (value: string) => void
    toDataURL.mockImplementationOnce(() => new Promise<string>(resolve => finish = resolve)).mockResolvedValueOnce('new-image')
    const url = ref('https://example.com/old')
    const scope = effectScope()
    const qr = scope.run(() => useQrCode(url, {}))!
    await vi.dynamicImportSettled()
    url.value = 'https://example.com/new'
    await nextTick()
    await vi.dynamicImportSettled()
    finish('old-image')
    await nextTick()
    expect(qr.qrCode.value).toBe('new-image')
    scope.stop()
  })
})

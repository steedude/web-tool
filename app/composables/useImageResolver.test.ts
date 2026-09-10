import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import { LinkResolveStatus } from '~/configs/link.config'
import { useImageResolver } from './useImageResolver'

afterEach(() => vi.unstubAllGlobals())

describe('image loading states', () => {
  it('distinguishes a service failure from not found and supports retry', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: LinkResolveStatus.NotFound })
    vi.stubGlobal('$fetch', fetch)
    vi.stubGlobal('useApiErrorMessage', () => () => 'Try again')
    const scope = effectScope()
    const resolver = scope.run(() => useImageResolver(ref('abc123')))!
    expect(resolver.loading.value).toBe(true)
    await resolver.resolveImage()
    expect(resolver.loadFailed.value).toBe(true)
    expect(resolver.image.value).toBeNull()
    await resolver.resolveImage()
    expect(resolver.loadFailed.value).toBe(false)
    expect(resolver.errorMessage.value).toBe('')
    expect(resolver.image.value?.status).toBe(LinkResolveStatus.NotFound)
    scope.stop()
  })

  it('keeps password entry available when verification fails', async () => {
    vi.stubGlobal('$fetch', vi.fn().mockResolvedValueOnce({ status: LinkResolveStatus.PasswordRequired }).mockRejectedValueOnce(new Error('offline')))
    vi.stubGlobal('useApiErrorMessage', () => () => 'Try again')
    const scope = effectScope()
    const resolver = scope.run(() => useImageResolver(ref('abc123')))!
    await resolver.resolveImage()
    expect(await resolver.resolveImage('secret')).toBe(false)
    expect(resolver.needsPassword.value).toBe(true)
    expect(resolver.loadFailed.value).toBe(false)
    expect(resolver.errorMessage.value).toBe('Try again')
    scope.stop()
  })
})

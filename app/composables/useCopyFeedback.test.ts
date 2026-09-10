import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { useCopyFeedback } from './useCopyFeedback'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('copy feedback', () => {
  it('keeps the latest success visible for the full duration and cleans up on disposal', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const scope = effectScope()
    const feedback = scope.run(useCopyFeedback)!
    await feedback.copy('first')
    vi.advanceTimersByTime(1000)
    await feedback.copy('second')
    vi.advanceTimersByTime(500)
    expect(feedback.copied.value).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(feedback.copied.value).toBe(false)
    await feedback.copy('third')
    scope.stop()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports clipboard failures and ignores obsolete pending copies', async () => {
    let finish!: () => void
    const writeText = vi.fn()
      .mockImplementationOnce(() => new Promise<void>(resolve => finish = resolve))
      .mockRejectedValueOnce(new Error('Clipboard denied'))
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const scope = effectScope()
    const feedback = scope.run(useCopyFeedback)!
    const first = feedback.copy('first')
    await feedback.copy('second')
    finish()
    await first
    expect(feedback.copyFailed.value).toBe(true)
    expect(feedback.copied.value).toBe(false)
    scope.stop()
  })
})

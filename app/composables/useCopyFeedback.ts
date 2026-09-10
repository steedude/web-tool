import { onScopeDispose, ref } from 'vue'

/** 共用複製結果，避免連續點擊時舊計時器提前清掉提示。 */
export function useCopyFeedback() {
  const copied = ref(false)
  const copyFailed = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let attempt = 0

  function reset() {
    attempt += 1
    clearTimeout(timer)
    copied.value = false
    copyFailed.value = false
  }

  async function copy(value: string) {
    reset()
    if (!value)
      return

    const currentAttempt = attempt
    try {
      await navigator.clipboard.writeText(value)
      if (currentAttempt !== attempt)
        return
      copied.value = true
      timer = setTimeout(() => copied.value = false, 1500)
    }
    catch {
      if (currentAttempt === attempt)
        copyFailed.value = true
    }
  }

  onScopeDispose(reset)
  return { copied, copy, copyFailed, reset }
}

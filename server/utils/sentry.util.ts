import * as Sentry from '@sentry/nuxt'
import { SentryHandledValue, SentryTagKey } from '../../sentry.shared'

interface CaptureHandledServerExceptionOptions {
  extra?: Record<string, unknown>
  tags?: Record<string, string>
}

export function captureHandledServerException(error: unknown, options: CaptureHandledServerExceptionOptions = {}) {
  const config = useRuntimeConfig()
  if (!config.sentryDsn)
    return

  Sentry.withScope((scope) => {
    scope.setTag(SentryTagKey.Handled, SentryHandledValue.True)

    for (const [key, value] of Object.entries(options.tags ?? {}))
      scope.setTag(key, value)

    for (const [key, value] of Object.entries(options.extra ?? {}))
      scope.setExtra(key, value)

    Sentry.captureException(error)
  })
}

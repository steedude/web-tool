import * as Sentry from '@sentry/nuxt'
import { getSentryApiErrorCode, isExpectedApiError } from './sentry.shared'

const runtimeConfig = useRuntimeConfig()
const dsn = runtimeConfig.public.sentryDsn

if (dsn) {
  Sentry.init({
    dsn,
    environment: runtimeConfig.public.sentryEnvironment || undefined,
    tracesSampleRate: 0,
    beforeSend(event, hint) {
      const error = hint.originalException
      const code = getSentryApiErrorCode(error)

      if (code)
        event.tags = { ...event.tags, api_error_code: code }
      if (isExpectedApiError(error))
        return null

      return event
    },
  })
}

import process from 'node:process'
import * as Sentry from '@sentry/nuxt'
import { getSentryApiErrorCode, isExpectedApiError } from './sentry.shared'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
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

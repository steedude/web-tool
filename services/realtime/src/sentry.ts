import process from 'node:process'
import * as Sentry from '@sentry/node'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0),
    initialScope: {
      tags: {
        service: 'realtime',
      },
    },
  })
}

export function captureRealtimeException(error: unknown) {
  if (dsn)
    Sentry.captureException(error)
}

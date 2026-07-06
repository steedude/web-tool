const EXPECTED_API_STATUS_MAX = 499

export enum SentryTagKey {
  Feature = 'feature',
  Handled = 'handled',
  Operation = 'operation',
}

export enum SentryHandledValue {
  True = 'true',
}

export enum SentryFeature {
  Drop = 'drop',
  ImageLink = 'image_link',
}

export enum SentryOperation {
  FileTransferQueue = 'file_transfer_queue',
  HandleSignal = 'handle_signal',
  StorageCleanup = 'storage_cleanup',
  StorageUpload = 'storage_upload',
}

export function getSentryApiErrorCode(error: unknown) {
  const data = (error as { data?: unknown })?.data
  const nestedData = (data as { data?: unknown } | undefined)?.data

  return getCode(nestedData) || getCode(data)
}

export function getSentryErrorStatusCode(error: unknown) {
  const statusCode = (error as { statusCode?: unknown, status?: unknown })?.statusCode
    ?? (error as { status?: unknown })?.status

  return typeof statusCode === 'number' ? statusCode : null
}

export function isExpectedApiError(error: unknown) {
  const code = getSentryApiErrorCode(error)
  const statusCode = getSentryErrorStatusCode(error)

  return Boolean(code && statusCode && statusCode <= EXPECTED_API_STATUS_MAX)
}

function getCode(data: unknown) {
  const code = (data as { code?: unknown } | undefined)?.code
  return typeof code === 'string' ? code : null
}

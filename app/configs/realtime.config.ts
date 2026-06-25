export const ROOM_CODE_CONFIG = {
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  length: 6,
  pattern: /^[A-Z0-9]{6}$/,
} as const

export const REALTIME_RETRY_CONFIG = {
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
} as const

export const DRAW_QR_CONFIG = {
  color: {
    dark: '#171714',
    light: '#ffffff',
  },
  margin: 2,
  width: 360,
} as const

export const DROP_QR_CONFIG = {
  color: {
    dark: '#171714',
    light: '#ffffff',
  },
  margin: 1,
  width: 320,
} as const

export const DROP_FILE_TRANSFER_CONFIG = {
  // 讓 DataChannel 佇列保持輕量。Safari/WebKit 在 SCTP 需要切分較大的 binary message，
  // 或一次排入太多 chunk 時，延遲可能會突然變得很高。
  bufferLowThreshold: 64 * 1024,
  chunkSize: 16 * 1024,
  maxBufferedAmount: 256 * 1024,
  maxFileSize: 50 * 1024 * 1024,
  maxUnackedBytes: 128 * 1024,
  // 有些手機瀏覽器不一定會穩定觸發 `bufferedamountlow`，所以也保留輪詢作為 fallback。
  ackPollIntervalMs: 40,
  bufferPollIntervalMs: 40,
  progressIntervalMs: 100,
  stallThresholdMs: 1000,
} as const

export const DROP_DEBUG_CONFIG = {
  statsIntervalMs: 1000,
} as const

export const DROP_CHANNEL_CONFIG = {
  controlLabel: 'drop-control',
  fileLabel: 'drop-file',
} as const

export const DROP_RTC_CONFIG = {
  // 這個 demo 用公開 STUN 就夠了；檔案內容走 WebRTC DataChannel，
  // VM 上的 WebSocket 只負責交換房間與信令訊息。
  iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
} satisfies RTCConfiguration

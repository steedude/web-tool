export const ROOM_CODE_CONFIG = {
  alphabet: 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789',
  length: 6,
  pattern: /^[A-Z0-9]{6}$/,
} as const

export const REALTIME_RETRY_CONFIG = {
  baseDelayMs: 1000,
  maxDelayMs: 10_000,
} as const

export const REMOTE_QR_CONFIG = {
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
  // Keep chunks small enough for DataChannel backpressure to stay responsive on mobile browsers.
  bufferLowThreshold: 256 * 1024,
  chunkSize: 16 * 1024,
  maxBufferedAmount: 512 * 1024,
  maxFileSize: 50 * 1024 * 1024,
} as const

export const DROP_RTC_CONFIG = {
  // A public STUN server is enough for this demo because file bytes move through WebRTC DataChannel,
  // while the VM-hosted WebSocket server only exchanges room and signaling messages.
  iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
} satisfies RTCConfiguration

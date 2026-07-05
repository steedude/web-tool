/** 即時連線中的角色，用來區分功能與主客端。 */
export enum RealtimeRole {
  DrawGuest = 'draw-guest',
  DrawHost = 'draw-host',
  DropGuest = 'drop-guest',
  DropHost = 'drop-host',
}

/** WebSocket 訊息種類。 */
export enum RealtimeMessageType {
  Connected = 'connected',
  DrawGiveUp = 'draw:give-up',
  DrawGuess = 'draw:guess',
  DrawState = 'draw:state',
  DrawStroke = 'draw:stroke',
  DrawUndo = 'draw:undo',
  Error = 'error',
  PeerJoined = 'peer:joined',
  PeerLeft = 'peer:left',
  RoomFull = 'room:full',
  RoomJoin = 'room:join',
  RoomJoined = 'room:joined',
  SignalAnswer = 'signal:answer',
  SignalIce = 'signal:ice',
  SignalOffer = 'signal:offer',
}

/** 前端顯示的即時連線狀態。 */
export enum RealtimeStatus {
  Connected = 'connected',
  Connecting = 'connecting',
  Idle = 'idle',
  Offline = 'offline',
}

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
  // 控制單次送入 DataChannel 的資料量，避免手機瀏覽器延遲突然升高。
  bufferLowThreshold: 64 * 1024,
  chunkSize: 16 * 1024,
  maxBufferedAmount: 256 * 1024,
  maxFileSize: 50 * 1024 * 1024,
  maxUnackedBytes: 128 * 1024,
  // bufferedamountlow 在部分瀏覽器不穩定，因此保留輪詢 fallback。
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
  // 預設只放 STUN；TURN 會由 useDropRtcConfiguration 依環境變數補上。
  iceServers: [{ urls: 'stun:stun.cloudflare.com:3478' }],
} satisfies RTCConfiguration

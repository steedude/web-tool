/** 即時房間中的角色，用來區分同一功能裡的主機端與加入端。 */
export enum RealtimeRole {
  /** 畫猜遊戲：掃 QR Code 加入房間的一方。 */
  DrawGuest = 'draw-guest',
  /** 畫猜遊戲：建立房間並顯示 QR Code 的一方。 */
  DrawHost = 'draw-host',
  /** AirDrop：掃 QR Code 加入傳輸房的一方。 */
  DropGuest = 'drop-guest',
  /** AirDrop：建立傳輸房並顯示 QR Code 的一方。 */
  DropHost = 'drop-host',
}

/** WebSocket 信令訊息類型，讓前後端用固定字串辨識每種事件。 */
export enum RealtimeMessageType {
  /** 已連上 WebSocket 伺服器。 */
  Connected = 'connected',
  /** WebSocket 或房間流程發生錯誤。 */
  Error = 'error',
  /** 另一台裝置加入同一個房間。 */
  PeerJoined = 'peer:joined',
  /** 另一台裝置離開或斷線。 */
  PeerLeft = 'peer:left',
  /** 房間已滿，不能再加入第三台裝置。 */
  RoomFull = 'room:full',
  /** 畫猜遊戲：玩家放棄目前題目。 */
  DrawGiveUp = 'draw:give-up',
  /** 畫猜遊戲：猜題者送出答案。 */
  DrawGuess = 'draw:guess',
  /** 畫猜遊戲：同步目前題目、畫畫者與上一題結果。 */
  DrawState = 'draw:state',
  /** 畫猜遊戲：同步一筆畫布筆畫。 */
  DrawStroke = 'draw:stroke',
  /** 畫猜遊戲：同步復原上一筆筆畫。 */
  DrawUndo = 'draw:undo',
  /** 加入指定房間。 */
  RoomJoin = 'room:join',
  /** 伺服器確認已加入房間。 */
  RoomJoined = 'room:joined',
  /** WebRTC：回傳 answer SDP。 */
  SignalAnswer = 'signal:answer',
  /** WebRTC：交換 ICE candidate。 */
  SignalIce = 'signal:ice',
  /** WebRTC：送出 offer SDP。 */
  SignalOffer = 'signal:offer',
}

/** WebSocket 連線狀態，供 UI 顯示目前是否可互動。 */
export enum RealtimeStatus {
  /** 已連線並可收發訊息。 */
  Connected = 'connected',
  /** 正在建立連線。 */
  Connecting = 'connecting',
  /** 尚未開始連線或等待初始化。 */
  Idle = 'idle',
  /** 連線中斷或無法連線。 */
  Offline = 'offline',
}

export interface RealtimeMessage {
  from?: RealtimeRole
  payload?: Record<string, unknown>
  role?: RealtimeRole
  type: RealtimeMessageType
}

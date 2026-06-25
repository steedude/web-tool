/** AirDrop 聊天列表裡的訊息種類。 */
export enum DropMessageKind {
  /** 完成接收後顯示的檔案訊息。 */
  File = 'file',
  /** 檔案傳輸結束控制訊息。 */
  FileEnd = 'file:end',
  /** 檔案傳輸進度控制訊息。 */
  FileProgress = 'file:progress',
  /** 接收端已準備好接收檔案。 */
  FileReady = 'file:ready',
  /** 檔案傳輸開始控制訊息。 */
  FileStart = 'file:start',
  /** 系統提示，例如連線或離線。 */
  System = 'system',
  /** 一般文字訊息。 */
  Text = 'text',
}

/** 單一檔案傳輸在 UI 上顯示的狀態。 */
export enum DropFileTransferStatus {
  /** 傳輸完成，可開啟或下載。 */
  Complete = 'complete',
  /** 正在接收對方的檔案。 */
  Receiving = 'receiving',
  /** 正在傳送檔案給對方。 */
  Sending = 'sending',
}

export interface DropChatItem {
  id: string
  kind: DropMessageKind
  mine: boolean
  name?: string
  progress?: number
  receivedBytes?: number
  size?: number
  speedBytesPerSecond?: number
  status?: DropFileTransferStatus
  text?: string
  url?: string
}

export interface IncomingDropFile {
  chunks: ArrayBuffer[]
  id: string
  lastProgressAt: number
  lastReceived: number
  name: string
  received: number
  size: number
  speedBytesPerSecond: number
  type: string
}

export interface OutgoingDropFileProgress {
  lastProgressAt: number
  lastReceived: number
  ready: boolean
}

export interface DropConnectionDebug {
  bufferedAmount: string
  bytesSummary: string
  candidatePath: string
  connectionState: string
  controlChannelState: string
  fileChannelState: string
  iceConnectionState: string
  iceGatheringState: string
  lastError: string
  lastSignal: string
  localCandidateSummary: string
  localDescriptionSet: boolean
  peerCandidateSummary: string
  peerDescriptionSet: boolean
  receiveRate: string
  roundTripTime: string
  sendRate: string
  signalingState: string
}

export interface DropStatsSnapshot {
  bytesReceived: number
  bytesSent: number
  timestamp: number
}

export interface DropDataMessage {
  id?: string
  kind: DropMessageKind
  name?: string
  received?: number
  size?: number
  text?: string
  type?: string
}

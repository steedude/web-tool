export enum DropMessageKind {
  File = 'file',
  FileEnd = 'file:end',
  FileProgress = 'file:progress',
  FileReady = 'file:ready',
  FileStart = 'file:start',
  System = 'system',
  Text = 'text',
}

export enum DropFileTransferStatus {
  Complete = 'complete',
  Receiving = 'receiving',
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

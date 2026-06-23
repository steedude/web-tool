export enum DropMessageKind {
  File = 'file',
  FileEnd = 'file:end',
  FileProgress = 'file:progress',
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
  startedAt: number
  type: string
}

export interface OutgoingDropFileProgress {
  lastProgressAt: number
  lastReceived: number
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

export interface DropDebugStats {
  availableOutgoingBitrate: number | null
  bufferedAmount: number
  bytesReceived: number
  bytesSent: number
  channelState: RTCDataChannelState
  connectionState: RTCPeerConnectionState
  currentRoundTripTime: number | null
  localCandidateType: string
  packetsLost: number
  packetsReceived: number
  packetsSent: number
  receiveBytesPerSecond: number
  remoteCandidateType: string
  selectedCandidatePairState: string
  sendBytesPerSecond: number
}

import type { DropFileTransferStatus, DropMessageKind } from '~/configs/drop.config'

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

export interface CreateDropFileMessageOptions {
  id: string
  mine: boolean
  name: string
  size: number
  status: DropFileTransferStatus
}

export interface TransferSpeedOptions {
  currentBytes: number
  currentTime: number
  previousBytes: number
  previousTime: number
}

export interface UpdateDropTransportDebugOptions {
  controlChannel: RTCDataChannel | null
  debug: DropConnectionDebug
  fileChannel: RTCDataChannel | null
  peer: RTCPeerConnection
  snapshot: DropStatsSnapshot
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

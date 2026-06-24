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

export interface DropDataMessage {
  id?: string
  kind: DropMessageKind
  name?: string
  received?: number
  size?: number
  text?: string
  type?: string
}

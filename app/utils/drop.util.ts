import type { CreateDropFileMessageOptions, DropChatItem, TransferSpeedOptions } from '~/types/drop.type'
import { DropMessageKind } from '~/configs/drop.config'

export function createDropFileMessage(options: CreateDropFileMessageOptions): DropChatItem {
  return {
    id: options.id,
    kind: DropMessageKind.File,
    mine: options.mine,
    name: options.name,
    progress: 0,
    receivedBytes: 0,
    size: options.size,
    speedBytesPerSecond: 0,
    status: options.status,
  }
}

export function getDropFileProgress(receivedBytes: number, totalBytes: number) {
  if (!totalBytes)
    return 0

  return Math.min(100, Math.round((receivedBytes / totalBytes) * 100))
}

export function getTransferSpeed(options: TransferSpeedOptions) {
  const elapsedSeconds = Math.max((options.currentTime - options.previousTime) / 1000, 0.001)
  const bytesDelta = Math.max(0, options.currentBytes - options.previousBytes)

  return bytesDelta / elapsedSeconds
}

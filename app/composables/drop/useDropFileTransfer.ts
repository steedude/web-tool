import type { DropChatItem, DropDataMessage, IncomingDropFile, OutgoingDropFileProgress } from '~/types/drop.type'
import { DROP_FILE_TRANSFER_CONFIG } from '~/configs/realtime.config'
import { DropFileTransferStatus, DropMessageKind } from '~/types/drop.type'
import { createDropFileMessage, getDropFileProgress, getTransferSpeed } from '~/utils/drop.util'

export interface UseDropFileTransferOptions {
  addFile: (file: DropChatItem) => void
  addText: (text: string, mine: boolean) => void
  getControlChannel: () => RTCDataChannel | null
  getFileChannel: () => RTCDataChannel | null
  updateFileMessage: (id: string, patch: Partial<DropChatItem>) => void
}

export function useDropFileTransfer(options: UseDropFileTransferOptions) {
  // 用來記錄每個正在送出的檔案，對方收到多少了
  const outgoingProgressMap = new Map<string, OutgoingDropFileProgress>()
  const pendingFiles: File[] = []

  let incomingFile: IncomingDropFile | null = null
  let lastProgressAt = 0
  let sendingFile = false

  function waitUntil(condition: () => boolean, intervalMs = DROP_FILE_TRANSFER_CONFIG.ackPollIntervalMs) {
    if (condition())
      return Promise.resolve()

    return new Promise<void>((resolve) => {
      let settled = false
      const pollTimer = setInterval(() => {
        if (condition())
          finish()
      }, intervalMs)

      function finish() {
        if (settled)
          return

        settled = true
        clearInterval(pollTimer)
        resolve()
      }
    })
  }

  function areTransferChannelsClosed() {
    return options.getControlChannel()?.readyState !== 'open' || options.getFileChannel()?.readyState !== 'open'
  }

  function sendControlMessage(data: DropDataMessage) {
    const controlChannel = options.getControlChannel()
    if (controlChannel?.readyState === 'open')
      controlChannel.send(JSON.stringify(data))
  }

  function getAcknowledgedBytes(fileId: string) {
    return outgoingProgressMap.get(fileId)?.lastReceived ?? 0
  }

  function isPeerReadyForFile(fileId: string) {
    return outgoingProgressMap.get(fileId)?.ready ?? false
  }

  function finishIncomingFile() {
    if (!incomingFile)
      return

    const blob = new Blob(incomingFile.chunks, { type: incomingFile.type })
    options.updateFileMessage(incomingFile.id, {
      progress: 100,
      receivedBytes: incomingFile.size,
      speedBytesPerSecond: 0,
      status: DropFileTransferStatus.Complete,
      url: URL.createObjectURL(blob),
    })

    sendFileProgressAck(incomingFile)
    incomingFile = null
  }

  function sendFileProgressAck(file: IncomingDropFile) {
    sendControlMessage({ id: file.id, kind: DropMessageKind.FileProgress, received: file.received, size: file.size })
  }

  function updateIncomingFileProgress(file: IncomingDropFile, force = false) {
    const now = Date.now()

    if (!force && now - lastProgressAt < DROP_FILE_TRANSFER_CONFIG.progressIntervalMs)
      return

    const speedBytesPerSecond = getTransferSpeed({
      currentBytes: file.received,
      currentTime: now,
      previousBytes: file.lastReceived,
      previousTime: file.lastProgressAt,
    })

    file.speedBytesPerSecond = speedBytesPerSecond
    file.lastProgressAt = now
    file.lastReceived = file.received
    lastProgressAt = now

    options.updateFileMessage(file.id, {
      progress: getDropFileProgress(file.received, file.size),
      receivedBytes: file.received,
      speedBytesPerSecond,
    })
  }

  function createIncomingFile(data: DropDataMessage) {
    const now = Date.now()
    const file: IncomingDropFile = {
      chunks: [],
      id: data.id!,
      lastProgressAt: now,
      lastReceived: 0,
      name: data.name!,
      received: 0,
      size: data.size!,
      speedBytesPerSecond: 0,
      type: data.type || 'application/octet-stream',
    }

    incomingFile = file
    lastProgressAt = 0
    options.addFile(createDropFileMessage({
      id: file.id,
      mine: false,
      name: file.name,
      size: file.size,
      status: DropFileTransferStatus.Receiving,
    }))

    sendControlMessage({ id: file.id, kind: DropMessageKind.FileReady })
  }

  function updateOutgoingFileProgress(data: DropDataMessage) {
    if (!data.id || data.received === undefined || !data.size)
      return

    const now = Date.now()
    const snapshot = outgoingProgressMap.get(data.id)
    const speedBytesPerSecond = snapshot
      ? getTransferSpeed({
          currentBytes: data.received,
          currentTime: now,
          previousBytes: snapshot.lastReceived,
          previousTime: snapshot.lastProgressAt,
        })
      : 0

    outgoingProgressMap.set(data.id, {
      lastProgressAt: now,
      lastReceived: data.received,
      ready: snapshot?.ready ?? false,
    })

    options.updateFileMessage(data.id, {
      progress: getDropFileProgress(data.received, data.size),
      receivedBytes: data.received,
      speedBytesPerSecond: data.received >= data.size ? 0 : speedBytesPerSecond,
      status: data.received >= data.size ? DropFileTransferStatus.Complete : DropFileTransferStatus.Sending,
    })
  }

  function handleDataMessage(data: DropDataMessage) {
    if (data.kind === DropMessageKind.Text && data.text) {
      options.addText(data.text, false)
      return
    }

    if (data.kind === DropMessageKind.FileStart && data.id && data.name && data.size !== undefined) {
      createIncomingFile(data)
      return
    }

    if (data.kind === DropMessageKind.FileReady && data.id) {
      const snapshot = outgoingProgressMap.get(data.id)
      if (snapshot)
        outgoingProgressMap.set(data.id, { ...snapshot, ready: true })
      return
    }

    if (data.kind === DropMessageKind.FileProgress) {
      updateOutgoingFileProgress(data)
      return
    }

    if (data.kind === DropMessageKind.FileEnd && (!data.id || incomingFile?.id === data.id))
      finishIncomingFile()
  }

  function handleFileChunk(chunk: ArrayBuffer) {
    if (!incomingFile)
      return

    incomingFile.chunks.push(chunk)
    incomingFile.received += chunk.byteLength

    const file = incomingFile
    sendFileProgressAck(file)
    updateIncomingFileProgress(file, file.received >= file.size)

    if (file.received >= file.size)
      finishIncomingFile()
  }

  // 同時聽 bufferedamountlow 與短輪詢，避免部分瀏覽器沒有穩定觸發事件而卡住。
  function waitForBuffer(targetChannel: RTCDataChannel | null) {
    if (!targetChannel || targetChannel.bufferedAmount < DROP_FILE_TRANSFER_CONFIG.maxBufferedAmount)
      return Promise.resolve()

    return new Promise<void>((resolve) => {
      let settled = false
      let pollTimer: ReturnType<typeof setInterval> | null = null

      const cleanup = () => {
        if (pollTimer)
          clearInterval(pollTimer)
        targetChannel.removeEventListener('bufferedamountlow', finish)
        targetChannel.removeEventListener('close', finish)
        targetChannel.removeEventListener('error', finish)
      }

      const hasRoomToSend = () =>
        targetChannel.readyState !== 'open'
        || targetChannel.bufferedAmount <= DROP_FILE_TRANSFER_CONFIG.bufferLowThreshold

      function finish() {
        if (settled)
          return

        settled = true
        cleanup()
        resolve()
      }

      pollTimer = setInterval(() => {
        if (hasRoomToSend())
          finish()
      }, DROP_FILE_TRANSFER_CONFIG.bufferPollIntervalMs)

      targetChannel.addEventListener('bufferedamountlow', finish)
      targetChannel.addEventListener('close', finish)
      targetChannel.addEventListener('error', finish)
    })
  }

  // 等接收端的 ACK 追上傳送進度，避免傳送端一次塞太多 binary chunk。
  // sentBytes - acknowledgedBytes >  maxUnackedBytes 就暫停。
  function waitForPeerWindow(fileId: string, sentBytes: number, waitForFullAck = false) {
    const hasEnoughAcknowledgement = () => {
      const acknowledgedBytes = getAcknowledgedBytes(fileId)
      if (waitForFullAck)
        return acknowledgedBytes >= sentBytes

      return sentBytes - acknowledgedBytes <= DROP_FILE_TRANSFER_CONFIG.maxUnackedBytes
    }

    return waitUntil(() => hasEnoughAcknowledgement() || areTransferChannelsClosed())
  }

  function waitForPeerReady(fileId: string) {
    return waitUntil(() => isPeerReadyForFile(fileId) || areTransferChannelsClosed())
  }

  function sendFile(file: File) {
    const controlChannel = options.getControlChannel()
    const fileChannel = options.getFileChannel()

    if (!controlChannel || !fileChannel || controlChannel.readyState !== 'open' || fileChannel.readyState !== 'open' || file.size > DROP_FILE_TRANSFER_CONFIG.maxFileSize)
      return

    pendingFiles.push(file)
    void processFileQueue()
  }

  async function processFileQueue() {
    if (sendingFile)
      return

    sendingFile = true
    try {
      while (pendingFiles.length > 0 && !areTransferChannelsClosed()) {
        const nextFile = pendingFiles.shift()
        if (nextFile)
          await sendQueuedFile(nextFile)
      }
    }
    catch {}
    finally {
      sendingFile = false
    }
  }

  async function sendQueuedFile(file: File) {
    const controlChannel = options.getControlChannel()
    const fileChannel = options.getFileChannel()

    if (!controlChannel || !fileChannel || controlChannel.readyState !== 'open' || fileChannel.readyState !== 'open')
      return

    const id = crypto.randomUUID()
    const now = Date.now()
    outgoingProgressMap.set(id, {
      lastProgressAt: now,
      lastReceived: 0,
      ready: false,
    })

    options.addFile(createDropFileMessage({
      id,
      mine: true,
      name: file.name,
      size: file.size,
      status: DropFileTransferStatus.Sending,
    }))

    controlChannel.send(JSON.stringify({ id, kind: DropMessageKind.FileStart, name: file.name, size: file.size, type: file.type }))
    await waitForPeerReady(id)

    const chunkSize = DROP_FILE_TRANSFER_CONFIG.chunkSize
    for (let offset = 0; offset < file.size; offset += chunkSize) {
      const nextOffset = Math.min(offset + chunkSize, file.size)
      fileChannel.send(await file.slice(offset, nextOffset).arrayBuffer())
      await waitForBuffer(fileChannel)
      await waitForPeerWindow(id, nextOffset)
    }

    await waitForPeerWindow(id, file.size, true)
    controlChannel.send(JSON.stringify({ id, kind: DropMessageKind.FileEnd }))
    outgoingProgressMap.delete(id)
  }

  function cleanupTransfer() {
    incomingFile = null
    pendingFiles.length = 0
    outgoingProgressMap.clear()
    sendingFile = false
  }

  return {
    cleanupTransfer,
    handleDataMessage,
    handleFileChunk,
    sendFile,
  }
}

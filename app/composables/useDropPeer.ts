import type { RealtimeRole } from '~/types/realtime.type'
import { useDropFileTransfer } from '~/composables/drop/useDropFileTransfer'
import { useDropMessages } from '~/composables/drop/useDropMessages'
import { useDropPeerConnection } from '~/composables/drop/useDropPeerConnection'

export function useDropPeer(roomId: Ref<string>, role: Ref<RealtimeRole.DropHost | RealtimeRole.DropGuest>) {
  const { t } = useI18n()
  const room = useRealtimeRoom(roomId, role)
  const dropMessages = useDropMessages()

  let getControlChannel = () => null as RTCDataChannel | null
  let getFileChannel = () => null as RTCDataChannel | null

  const fileTransfer = useDropFileTransfer({
    addFile: dropMessages.addFile,
    addText: dropMessages.addText,
    getControlChannel: () => getControlChannel(),
    getFileChannel: () => getFileChannel(),
    updateFileMessage: dropMessages.updateFileMessage,
  })

  const connection = useDropPeerConnection({
    addSystemMessage: dropMessages.addSystemMessage,
    handleDataMessage: fileTransfer.handleDataMessage,
    handleFileChunk: fileTransfer.handleFileChunk,
    role,
    sendRealtimeMessage: room.send,
  })

  getControlChannel = connection.getControlChannel
  getFileChannel = connection.getFileChannel

  watch(room.latestMessage, (message) => {
    if (!message)
      return

    connection.handleSignal(message).catch(() => {
      dropMessages.addSystemMessage(t('drop.system.signalFailed'))
    })
  })

  onBeforeUnmount(() => {
    connection.cleanupConnection()
    fileTransfer.cleanupTransfer()
    dropMessages.revokeFileUrls()
  })

  function sendText(text: string) {
    const trimmed = text.trim()
    const sent = connection.sendText(trimmed)

    if (sent)
      dropMessages.addText(trimmed, true)

    return sent
  }

  return {
    debug: readonly(connection.debug),
    isReady: connection.isReady,
    messages: dropMessages.messages,
    peerConnected: room.peerConnected,
    roomFull: room.roomFull,
    sendFile: fileTransfer.sendFile,
    sendText,
  }
}

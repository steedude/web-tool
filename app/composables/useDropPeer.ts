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
  let setLastError = (_message: string) => {}

  const fileTransfer = useDropFileTransfer({
    addFile: dropMessages.addFile,
    addText: dropMessages.addText,
    getControlChannel: () => getControlChannel(),
    getFileChannel: () => getFileChannel(),
    setLastError: message => setLastError(message),
    updateFileMessage: dropMessages.updateFileMessage,
  })

  const connection = useDropPeerConnection({
    addSystem: dropMessages.addSystem,
    handleDataMessage: fileTransfer.handleDataMessage,
    handleFileChunk: fileTransfer.handleFileChunk,
    role,
    roomSend: room.send,
    t,
  })

  getControlChannel = connection.getControlChannel
  getFileChannel = connection.getFileChannel
  setLastError = connection.setLastError

  watch(room.latestMessage, (message) => {
    if (!message)
      return

    connection.handleSignal(message).catch((error) => {
      connection.setLastError(error instanceof Error ? error.message : String(error))
      dropMessages.addSystem(t('drop.system.signalFailed'))
    })
  })

  onBeforeUnmount(() => {
    connection.cleanupConnection()
    fileTransfer.cleanupTransfer()
    dropMessages.revokeFileUrls()
  })

  return {
    debug: readonly(connection.debug),
    isReady: connection.isReady,
    messages: dropMessages.messages,
    peerConnected: room.peerConnected,
    roomFull: room.roomFull,
    sendFile: fileTransfer.sendFile,
    sendText(text: string) {
      const sent = connection.sendText(text)
      if (sent)
        dropMessages.addText(text.trim(), true)

      return sent
    },
  }
}

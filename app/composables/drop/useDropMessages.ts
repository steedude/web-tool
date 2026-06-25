import type { DropChatItem } from '~/types/drop.type'
import { DropMessageKind } from '~/types/drop.type'

export function useDropMessages() {
  const messages = ref<DropChatItem[]>([])

  function addSystem(text: string) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.System, mine: false, text })
  }

  function addText(text: string, mine: boolean) {
    messages.value.push({ id: crypto.randomUUID(), kind: DropMessageKind.Text, mine, text })
  }

  function addFile(file: DropChatItem) {
    messages.value.push(file)
  }

  function updateFileMessage(id: string, patch: Partial<DropChatItem>) {
    const message = messages.value.find(item => item.id === id)
    if (message)
      Object.assign(message, patch)
  }

  function revokeFileUrls() {
    messages.value.forEach((message) => {
      if (message.url)
        URL.revokeObjectURL(message.url)
    })
  }

  return {
    addFile,
    addSystem,
    addText,
    messages,
    revokeFileUrls,
    updateFileMessage,
  }
}

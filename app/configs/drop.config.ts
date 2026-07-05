/** AirDrop 聊天與檔案傳輸訊息種類。 */
export enum DropMessageKind {
  File = 'file',
  FileEnd = 'file:end',
  FileProgress = 'file:progress',
  FileReady = 'file:ready',
  FileStart = 'file:start',
  System = 'system',
  Text = 'text',
}

/** 檔案傳輸在 UI 中顯示的狀態。 */
export enum DropFileTransferStatus {
  Complete = 'complete',
  Receiving = 'receiving',
  Sending = 'sending',
}

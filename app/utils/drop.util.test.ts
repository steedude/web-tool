import { describe, expect, it } from 'vitest'
import { DropFileTransferStatus, DropMessageKind } from '~/types/drop.type'
import { createDropFileMessage, getDropFileProgress, getTransferSpeed } from './drop.util'

describe('drop utilities', () => {
  it('creates an initial file chat item', () => {
    expect(createDropFileMessage({
      id: 'file-1',
      mine: true,
      name: 'photo.jpg',
      size: 1024,
      status: DropFileTransferStatus.Sending,
    })).toEqual({
      id: 'file-1',
      kind: DropMessageKind.File,
      mine: true,
      name: 'photo.jpg',
      progress: 0,
      receivedBytes: 0,
      size: 1024,
      speedBytesPerSecond: 0,
      status: DropFileTransferStatus.Sending,
    })
  })

  it('calculates bounded file progress', () => {
    expect(getDropFileProgress(512, 1024)).toBe(50)
    expect(getDropFileProgress(2048, 1024)).toBe(100)
    expect(getDropFileProgress(512, 0)).toBe(0)
  })

  it('calculates transfer speed from byte deltas', () => {
    expect(getTransferSpeed({
      currentBytes: 2048,
      currentTime: 2000,
      previousBytes: 1024,
      previousTime: 1000,
    })).toBe(1024)
  })
})

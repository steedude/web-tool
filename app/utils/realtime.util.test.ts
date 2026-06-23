import { describe, expect, it } from 'vitest'
import { ROOM_CODE_CONFIG } from '~/configs/realtime.config'
import { createRoomCode, isRoomCode, normalizeRoomCode } from './realtime.util'

describe('realtime room utilities', () => {
  it('creates room codes that match the public room format', () => {
    const roomCode = createRoomCode()

    expect(roomCode).toHaveLength(ROOM_CODE_CONFIG.length)
    expect(isRoomCode(roomCode)).toBe(true)
  })

  it('normalizes pasted room codes before joining', () => {
    expect(normalizeRoomCode(' ab-c12 3xxx')).toBe('ABC123')
  })

  it('rejects incomplete room codes', () => {
    expect(isRoomCode('ABC12')).toBe(false)
  })
})

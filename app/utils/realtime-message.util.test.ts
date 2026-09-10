import { describe, expect, it } from 'vitest'
import { RealtimeMessageType, RealtimeRole } from '~/configs/realtime.config'
import { parseRealtimeMessage } from './realtime-message.util'

describe('realtime message boundary', () => {
  it('accepts room events, valid drawing state and WebRTC signals', () => {
    const messages = [
      { type: RealtimeMessageType.Connected },
      { type: RealtimeMessageType.PeerJoined, role: RealtimeRole.DrawGuest },
      { type: RealtimeMessageType.DrawState, payload: { state: { drawerRole: RealtimeRole.DrawHost, promptIndex: 0 } } },
      { type: RealtimeMessageType.DrawStroke, payload: { stroke: { id: 'a', x0: 0, y0: 0, x1: 0.5, y1: 1 } } },
      { type: RealtimeMessageType.SignalOffer, payload: { sdp: { type: 'offer', sdp: 'v=0' } } },
      { type: RealtimeMessageType.SignalIce, payload: { candidate: { candidate: '', sdpMid: null, sdpMLineIndex: 0 } } },
    ]
    for (const message of messages)
      expect(parseRealtimeMessage(JSON.stringify(message))).toEqual(message)
  })

  it.each([
    'not json',
    'null',
    '{"type":"unknown"}',
    '{"type":"draw:guess","payload":{"guess":123}}',
    '{"type":"draw:state","payload":{"state":{"drawerRole":"draw-host","promptIndex":999}}}',
    '{"type":"draw:stroke","payload":{"stroke":{"id":"a","x0":-1,"x1":1,"y0":0,"y1":1}}}',
    '{"type":"signal:offer","payload":{"sdp":{"type":"answer","sdp":"v=0"}}}',
    '{"type":"signal:ice","payload":{"candidate":{"candidate":"x","sdpMLineIndex":"bad"}}}',
  ])('ignores malformed input: %s', (value) => {
    expect(parseRealtimeMessage(value)).toBeNull()
  })
})

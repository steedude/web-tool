export enum RealtimeRole {
  DrawGuest = 'draw-guest',
  DrawHost = 'draw-host',
  DropGuest = 'drop-guest',
  DropHost = 'drop-host',
}

export enum RealtimeMessageType {
  Connected = 'connected',
  Error = 'error',
  PeerJoined = 'peer:joined',
  PeerLeft = 'peer:left',
  RoomFull = 'room:full',
  DrawGiveUp = 'draw:give-up',
  DrawGuess = 'draw:guess',
  DrawState = 'draw:state',
  DrawStroke = 'draw:stroke',
  DrawUndo = 'draw:undo',
  RoomJoin = 'room:join',
  RoomJoined = 'room:joined',
  SignalAnswer = 'signal:answer',
  SignalIce = 'signal:ice',
  SignalOffer = 'signal:offer',
}

export enum RealtimeStatus {
  Connected = 'connected',
  Connecting = 'connecting',
  Idle = 'idle',
  Offline = 'offline',
}

export interface RealtimeMessage {
  from?: RealtimeRole
  payload?: Record<string, unknown>
  role?: RealtimeRole
  type: RealtimeMessageType
}

export enum RealtimeRole {
  Desktop = 'desktop',
  DropGuest = 'drop-guest',
  DropHost = 'drop-host',
  Remote = 'remote',
}

export enum RealtimeMessageType {
  Connected = 'connected',
  Error = 'error',
  PeerJoined = 'peer:joined',
  PeerLeft = 'peer:left',
  RoomFull = 'room:full',
  RemoteDraw = 'remote:draw',
  RemoteGameState = 'remote:game-state',
  RemoteGiveUp = 'remote:give-up',
  RemoteGuess = 'remote:guess',
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

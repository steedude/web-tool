import type { DropConnectionDebug, DropStatsSnapshot } from '~/types/drop.type'
import { formatBytes } from '~/utils/file.util'

export interface UpdateDropTransportDebugOptions {
  controlChannel: RTCDataChannel | null
  debug: DropConnectionDebug
  fileChannel: RTCDataChannel | null
  peer: RTCPeerConnection
  snapshot: DropStatsSnapshot
}

export function createDropConnectionDebug(): DropConnectionDebug {
  return {
    bufferedAmount: '0 B',
    bytesSummary: '0 B / 0 B',
    candidatePath: '—',
    connectionState: 'new',
    controlChannelState: 'closed',
    fileChannelState: 'closed',
    iceConnectionState: 'new',
    iceGatheringState: 'new',
    localCandidateSummary: '0',
    localDescriptionSet: false,
    peerCandidateSummary: '0',
    peerDescriptionSet: false,
    receiveRate: '0 B/s',
    roundTripTime: '—',
    sendRate: '0 B/s',
    signalingState: 'stable',
  }
}

export function createDropStatsSnapshot(): DropStatsSnapshot {
  return {
    bytesReceived: 0,
    bytesSent: 0,
    timestamp: 0,
  }
}

export function resetDropTransportDebug(debug: DropConnectionDebug) {
  debug.bufferedAmount = '0 B'
  debug.bytesSummary = '0 B / 0 B'
  debug.candidatePath = '—'
  debug.receiveRate = '0 B/s'
  debug.roundTripTime = '—'
  debug.sendRate = '0 B/s'
}

export function trackDropCandidate(counts: Map<string, number>, candidate?: string) {
  const type = getCandidateType(candidate)
  counts.set(type, (counts.get(type) ?? 0) + 1)
  return formatCandidateSummary(counts)
}

export async function updateDropTransportDebug(options: UpdateDropTransportDebugOptions) {
  const stats = await options.peer.getStats()
  const selectedPair = getSelectedCandidatePair(stats)
  const now = Date.now()
  const bufferedAmount = (options.controlChannel?.bufferedAmount ?? 0) + (options.fileChannel?.bufferedAmount ?? 0)

  options.debug.bufferedAmount = formatBytes(bufferedAmount)

  if (!selectedPair)
    return options.snapshot

  const bytesSent = getStatsNumber(selectedPair, 'bytesSent')
  const bytesReceived = getStatsNumber(selectedPair, 'bytesReceived')
  const rttSeconds = getStatsNumber(selectedPair, 'currentRoundTripTime')
  const elapsedSeconds = Math.max((now - options.snapshot.timestamp) / 1000, 0.001)

  options.debug.bytesSummary = `${formatBytes(bytesSent)} / ${formatBytes(bytesReceived)}`
  options.debug.candidatePath = getCandidatePath(stats, selectedPair)
  options.debug.roundTripTime = rttSeconds ? `${Math.round(rttSeconds * 1000)} ms` : '—'

  if (options.snapshot.timestamp) {
    options.debug.sendRate = formatRate((bytesSent - options.snapshot.bytesSent) / elapsedSeconds)
    options.debug.receiveRate = formatRate((bytesReceived - options.snapshot.bytesReceived) / elapsedSeconds)
  }

  return { bytesReceived, bytesSent, timestamp: now }
}

function getCandidateType(candidate?: string) {
  return candidate?.match(/ typ ([a-z0-9]+)/i)?.[1] ?? 'unknown'
}

function formatCandidateSummary(counts: Map<string, number>) {
  if (!counts.size)
    return '0'

  return Array.from(counts.entries())
    .map(([type, count]) => `${type}:${count}`)
    .join(' ')
}

function formatRate(bytesPerSecond: number) {
  return `${formatBytes(Math.max(0, bytesPerSecond))}/s`
}

function getStatsNumber(report: RTCStats, key: string) {
  const value = (report as unknown as Record<string, unknown>)[key]
  return typeof value === 'number' ? value : 0
}

function getStatsString(report: RTCStats, key: string) {
  const value = (report as unknown as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : ''
}

function getSelectedCandidatePair(stats: RTCStatsReport) {
  for (const report of stats.values()) {
    if (report.type !== 'candidate-pair')
      continue

    const record = report as unknown as Record<string, unknown>
    const selected = record.selected === true
    const nominated = record.nominated === true && record.state === 'succeeded'
    if (selected || nominated)
      return report
  }
}

function getCandidatePath(stats: RTCStatsReport, pair: RTCStats) {
  const localCandidate = stats.get(getStatsString(pair, 'localCandidateId'))
  const peerCandidate = stats.get(getStatsString(pair, 'remoteCandidateId'))
  const localType = localCandidate ? getStatsString(localCandidate, 'candidateType') : ''
  const peerType = peerCandidate ? getStatsString(peerCandidate, 'candidateType') : ''

  if (!localType && !peerType)
    return '—'

  return `${localType || '?'} → ${peerType || '?'}`
}

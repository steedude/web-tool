import { DROP_DEBUG_CONFIG } from '~/configs/realtime.config'
import { createDropConnectionDebug, createDropStatsSnapshot, resetDropTransportDebug, trackDropCandidate, updateDropTransportDebug } from '~/utils/drop-debug.util'

export interface UseDropDebugStatsOptions {
  getControlChannel: () => RTCDataChannel | null
  getFileChannel: () => RTCDataChannel | null
  getPeer: () => RTCPeerConnection | null
}

export function useDropDebugStats(options: UseDropDebugStatsOptions) {
  const debug = reactive(createDropConnectionDebug())
  const localCandidateCounts = new Map<string, number>()
  const peerCandidateCounts = new Map<string, number>()

  let statsTimer: ReturnType<typeof setInterval> | null = null
  let lastStatsSnapshot = createDropStatsSnapshot()

  async function updateTransportStats() {
    const peer = options.getPeer()
    if (!peer)
      return

    lastStatsSnapshot = await updateDropTransportDebug({
      controlChannel: options.getControlChannel(),
      debug,
      fileChannel: options.getFileChannel(),
      peer,
      snapshot: lastStatsSnapshot,
    })
  }

  function stopStatsPolling() {
    if (statsTimer)
      clearInterval(statsTimer)

    statsTimer = null
  }

  function startStatsPolling() {
    stopStatsPolling()
    lastStatsSnapshot = createDropStatsSnapshot()

    statsTimer = setInterval(() => {
      updateTransportStats().catch((error) => {
        debug.lastError = error instanceof Error ? error.message : String(error)
      })
    }, DROP_DEBUG_CONFIG.statsIntervalMs)
  }

  function resetDebug() {
    stopStatsPolling()
    localCandidateCounts.clear()
    peerCandidateCounts.clear()
    debug.localCandidateSummary = '0'
    debug.peerCandidateSummary = '0'
    resetDropTransportDebug(debug)
  }

  function setLastError(message: string) {
    debug.lastError = message
  }

  function trackLocalCandidate(candidate: string) {
    debug.localCandidateSummary = trackDropCandidate(localCandidateCounts, candidate)
  }

  function trackPeerCandidate(candidate?: string) {
    debug.peerCandidateSummary = trackDropCandidate(peerCandidateCounts, candidate)
  }

  function updatePeerDebug() {
    const peer = options.getPeer()
    const nextConnectionState = peer?.connectionState ?? 'closed'
    const nextIceConnectionState = peer?.iceConnectionState ?? 'closed'

    debug.connectionState = nextConnectionState
    debug.iceConnectionState = nextIceConnectionState
    debug.iceGatheringState = peer?.iceGatheringState ?? 'complete'
    debug.localDescriptionSet = !!peer?.localDescription
    debug.peerDescriptionSet = !!peer?.remoteDescription
    debug.signalingState = peer?.signalingState ?? 'closed'

    if (nextConnectionState === 'connected' && ['connected', 'completed'].includes(nextIceConnectionState))
      debug.lastError = ''
  }

  return {
    debug,
    resetDebug,
    setLastError,
    startStatsPolling,
    stopStatsPolling,
    trackLocalCandidate,
    trackPeerCandidate,
    updatePeerDebug,
  }
}

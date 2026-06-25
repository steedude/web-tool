<script setup lang="ts">
import type { DropConnectionDebug } from '~/types/drop.type'

defineProps<{
  debug: DropConnectionDebug
  peerConnected: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <details class="mt-5 border-2 border-ink bg-white p-3 text-xs">
    <summary class="cursor-pointer font-black">
      {{ t('drop.debug.title') }}
    </summary>
    <dl class="mt-3 grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 font-mono">
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.peer') }}
      </dt>
      <dd class="break-all">
        {{ peerConnected ? t('drop.debug.yes') : t('drop.debug.no') }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.connection') }}
      </dt>
      <dd class="break-all">
        {{ debug.connectionState }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.ice') }}
      </dt>
      <dd class="break-all">
        {{ debug.iceConnectionState }} {{ t('drop.debug.separator') }} {{ debug.iceGatheringState }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.localIce') }}
      </dt>
      <dd class="break-all">
        {{ debug.localCandidateSummary }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.peerIce') }}
      </dt>
      <dd class="break-all">
        {{ debug.peerCandidateSummary }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.signaling') }}
      </dt>
      <dd class="break-all">
        {{ debug.signalingState }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.sdp') }}
      </dt>
      <dd class="break-all">
        {{ t('drop.debug.local') }}{{ debug.localDescriptionSet ? t('drop.debug.yes') : t('drop.debug.no') }}
        {{ t('drop.debug.separator') }}
        {{ t('drop.debug.peerLabel') }}{{ debug.peerDescriptionSet ? t('drop.debug.yes') : t('drop.debug.no') }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.channels') }}
      </dt>
      <dd class="break-all">
        {{ t('drop.debug.control') }}{{ debug.controlChannelState }}
        {{ t('drop.debug.separator') }}
        {{ t('drop.debug.file') }}{{ debug.fileChannelState }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.buffer') }}
      </dt>
      <dd class="break-all">
        {{ debug.bufferedAmount }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.rtt') }}
      </dt>
      <dd class="break-all">
        {{ debug.roundTripTime }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.sendRate') }}
      </dt>
      <dd class="break-all">
        {{ debug.sendRate }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.receiveRate') }}
      </dt>
      <dd class="break-all">
        {{ debug.receiveRate }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.candidatePath') }}
      </dt>
      <dd class="break-all">
        {{ debug.candidatePath }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.bytes') }}
      </dt>
      <dd class="break-all">
        {{ debug.bytesSummary }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.lastSignal') }}
      </dt>
      <dd class="break-all">
        {{ debug.lastSignal || t('drop.debug.empty') }}
      </dd>
      <dt class="font-bold text-black/55">
        {{ t('drop.debug.error') }}
      </dt>
      <dd class="break-all">
        {{ debug.lastError || t('drop.debug.empty') }}
      </dd>
    </dl>
  </details>
</template>

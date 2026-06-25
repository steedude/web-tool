<script setup lang="ts">
defineProps<{
  connectionLabel: string
  copied: boolean
  inviteUrl: string
  peerConnected: boolean
  qrCode: string
  roomId: string
}>()

defineEmits<{
  copyLink: []
}>()

const { t } = useI18n()
</script>

<template>
  <aside class="h-fit rounded-[2rem] border-2 border-ink bg-white p-5 shadow-[7px_7px_0_#171714]">
    <div class="flex items-center justify-between gap-3">
      <span class="text-xs font-black">{{ t('draw.room') }}</span>
      <span class="inline-flex items-center gap-2 text-[11px] font-black">
        <span :class="peerConnected ? 'bg-emerald-500' : 'bg-amber-400'" class="size-2 rounded-full" />
        {{ connectionLabel }}
      </span>
    </div>
    <p class="mt-3 font-mono text-3xl font-black tracking-[0.18em]">
      {{ roomId || '------' }}
    </p>

    <p class="mt-8 text-center text-xs font-black tracking-wider uppercase">
      {{ t('draw.scan') }}
    </p>
    <div class="mt-4 aspect-square overflow-hidden rounded-2xl border-2 border-ink bg-white p-2">
      <img v-if="qrCode" :src="qrCode" :alt="t('draw.scan')" class="size-full" width="360" height="360">
      <div v-else class="size-full animate-pulse rounded-xl bg-black/5" />
    </div>
    <button
      type="button"
      class="focus-ring mt-4 w-full rounded-xl border-2 border-ink bg-acid px-4 py-3 text-sm font-black transition hover:-translate-y-0.5"
      :disabled="!inviteUrl"
      @click="$emit('copyLink')"
    >
      {{ copied ? t('draw.copied') : t('draw.copyLink') }}
    </button>
    <p class="mt-4 text-center text-[11px] leading-5 font-semibold text-black/45">
      {{ t('draw.desktopHint') }}
    </p>
    <p class="mt-3 rounded-xl border border-ink/15 bg-paper px-3 py-2 text-center text-[11px] leading-5 font-semibold text-black/55">
      {{ t('draw.networkHint') }}
    </p>
  </aside>
</template>

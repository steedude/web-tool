<script setup lang="ts">
import { RealtimeRole } from '~/configs/realtime.config'
import { isRoomCode, normalizeRoomCode } from '~/utils/realtime.util'

defineEmits<{
  start: [role: RealtimeRole.DropHost | RealtimeRole.DropGuest, roomCode?: string]
}>()

const roomInput = defineModel<string>('roomInput', { required: true })

const { t } = useI18n()
</script>

<template>
  <section class="mt-10 grid min-w-0 gap-8 lg:grid-cols-[1.2fr_.8fr]">
    <div class="min-w-0">
      <p class="max-w-full wrap-break-word text-xs font-black tracking-[.18em] text-ink/70 lg:text-sm lg:tracking-[.24em]">
        {{ t('drop.eyebrow') }}
      </p>
      <h1 class="mt-5 max-w-4xl text-[clamp(3rem,13vw,4.5rem)] leading-[.95] font-black tracking-[-.055em] wrap-break-word lg:text-7xl">
        {{ t('drop.title') }}
      </h1>
      <p class="mt-6 max-w-2xl wrap-break-word text-lg leading-8">
        {{ t('drop.description') }}
      </p>
    </div>
    <div class="min-w-0 border-2 border-ink bg-white p-5 shadow-[8px_8px_0_#171714] lg:p-7">
      <button class="focus-ring w-full border-2 border-ink bg-sky px-5 py-5 text-left text-xl font-black transition hover:-translate-y-1" @click="$emit('start', RealtimeRole.DropHost)">
        {{ t('drop.actions.createRoom') }} <span class="float-right">{{ t('common.arrowRight') }}</span>
      </button>
      <div class="my-5 flex items-center gap-3 text-xs font-black tracking-[.2em]">
        <span class="h-px flex-1 bg-ink/30" />{{ t('drop.joinDivider') }}<span class="h-px flex-1 bg-ink/30" />
      </div>
      <form class="flex min-w-0 gap-2" @submit.prevent="$emit('start', RealtimeRole.DropGuest, roomInput)">
        <input v-model="roomInput" maxlength="6" placeholder="ABC123" class="focus-ring min-w-0 flex-1 border-2 border-ink bg-paper px-4 py-4 font-mono text-xl font-black uppercase" @input="roomInput = normalizeRoomCode(roomInput)">
        <button class="focus-ring border-2 border-ink bg-ink px-5 font-black text-white disabled:opacity-40" :disabled="!isRoomCode(roomInput)">
          {{ t('drop.actions.join') }}
        </button>
      </form>
    </div>
  </section>
</template>

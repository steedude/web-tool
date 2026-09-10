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
      <PageHeader :eyebrow="t('drop.eyebrow')" :title="t('drop.title')" :description="t('drop.description')" />
    </div>
    <div class="rounded-panel min-w-0 border-2 border-ink bg-white p-5 shadow-panel lg:p-7">
      <button class="ui-button w-full bg-sky px-5 py-5 text-left text-xl hover:-translate-y-1" @click="$emit('start', RealtimeRole.DropHost)">
        {{ t('drop.actions.createRoom') }} <span class="float-right">{{ t('common.arrowRight') }}</span>
      </button>
      <div class="my-5 flex items-center gap-3 text-xs font-black tracking-[.2em]">
        <span class="h-px flex-1 bg-ink/30" />{{ t('drop.joinDivider') }}<span class="h-px flex-1 bg-ink/30" />
      </div>
      <form class="flex min-w-0 gap-2" @submit.prevent="$emit('start', RealtimeRole.DropGuest, roomInput)">
        <input v-model="roomInput" maxlength="6" placeholder="ABC123" class="ui-input min-w-0 flex-1 py-4 font-mono text-xl font-black uppercase" @input="roomInput = normalizeRoomCode(roomInput)">
        <button class="ui-button ui-button-primary px-5" :disabled="!isRoomCode(roomInput)">
          {{ t('drop.actions.join') }}
        </button>
      </form>
    </div>
  </section>
</template>

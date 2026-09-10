<script setup lang="ts">
defineProps<{ copyFailed: boolean, qrFailed: boolean }>()
defineEmits<{ retryQr: [] }>()
const { t } = useI18n()
</script>

<template>
  <div v-if="copyFailed || qrFailed" class="space-y-3">
    <AppAlert v-if="copyFailed">
      {{ t('common.copyFailed') }}
    </AppAlert>
    <AppAlert v-if="qrFailed">
      {{ t('common.qrFailed') }}
      <button type="button" class="ui-button ml-2 underline" @click="$emit('retryQr')">
        {{ t('common.retry') }}
      </button>
    </AppAlert>
  </div>
</template>

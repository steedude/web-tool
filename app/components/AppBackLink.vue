<script setup lang="ts">
withDefaults(defineProps<{ label?: string, to?: string }>(), { to: '/' })
const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <NuxtLink :to="localePath(to)" class="focus-ring inline-flex items-center gap-2 rounded-control py-2 text-sm font-bold underline decoration-2 underline-offset-4">
    <span aria-hidden="true">{{ t('common.arrowLeft') }}</span>
    {{ label || t('common.backHome') }}
  </NuxtLink>
</template>

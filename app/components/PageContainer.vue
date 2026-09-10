<script setup lang="ts">
withDefaults(defineProps<{
  compact?: boolean
  width?: 'wide' | 'medium' | 'narrow'
}>(), { compact: false, width: 'wide' })

const widths = { wide: 'max-w-7xl', medium: 'max-w-6xl', narrow: 'max-w-5xl' }
</script>

<template>
  <div class="mx-auto w-full min-w-0 px-5 lg:px-8" :class="[widths[width], compact ? 'pt-4 pb-8' : 'py-10 lg:py-16']">
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'error' | 'info' }>(), { tone: 'error' })
</script>

<template>
  <p class="rounded-control border-l-4 px-4 py-3 text-sm font-bold" :class="tone === 'error' ? 'border-coral bg-coral/15' : 'border-sky bg-sky/20'" :role="tone === 'error' ? 'alert' : 'status'">
    <slot />
  </p>
</template>

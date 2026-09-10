<script setup lang="ts">
defineProps<{
  description?: string
  eyebrow: string
  title: string
}>()
</script>

<template>
  <div class="min-w-0">
    <p class="page-eyebrow">
      {{ eyebrow }}
    </p>
    <h1 class="page-title">
      {{ title }}
    </h1>
    <p v-if="description" class="page-description">
      {{ description }}
    </p>
  </div>
</template>

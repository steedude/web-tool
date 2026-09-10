<script setup lang="ts">
withDefaults(defineProps<{
  actionLabel?: string
  eyebrow: string
  message: string
  statusCode?: number | string
  title: string
  to?: string
}>(), {
  actionLabel: '',
  statusCode: '',
  to: '',
})

const emit = defineEmits<{
  action: []
}>()
</script>

<template>
  <section class="rounded-panel w-full border-2 border-ink bg-white p-6 shadow-accent lg:p-10">
    <p class="text-xs font-black tracking-[.24em] text-ink/50">
      {{ eyebrow }}
    </p>
    <p v-if="statusCode" class="mt-6 font-mono text-8xl leading-none font-black text-coral lg:text-9xl">
      {{ statusCode }}
    </p>
    <h1 class="mt-5 text-4xl leading-none font-black tracking-[-.055em] lg:text-6xl">
      {{ title }}
    </h1>
    <p class="mt-5 max-w-2xl text-lg leading-8 text-ink/70">
      {{ message }}
    </p>
    <NuxtLink
      v-if="to && actionLabel"
      :to="to"
      class="focus-ring mt-8 inline-flex border-2 border-ink bg-ink px-5 py-3 font-black text-white"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  accent: string
  description: string
  index: string
  title: string
}>()

const { t } = useI18n()
const localePath = useLocalePath()
</script>

<template>
  <div class="mx-auto flex min-h-[calc(100vh-96px)] w-full max-w-5xl items-center px-5 py-16 sm:px-8">
    <section class="relative w-full overflow-hidden rounded-[2.5rem] border-2 border-ink bg-white p-8 shadow-[9px_9px_0_#171714] sm:p-14">
      <div :class="accent" class="absolute -top-32 -right-24 size-80 rounded-full border-2 border-ink" />
      <p class="relative font-mono text-xs font-black tracking-[0.2em]">
        {{ t('placeholder.experiment', { index }) }}
      </p>
      <h1 class="relative mt-8 max-w-3xl text-5xl leading-none font-black tracking-[-0.06em] sm:text-7xl">
        {{ title }}
      </h1>
      <p class="relative mt-7 max-w-xl text-lg leading-8 font-semibold text-black/60">
        {{ description }}
      </p>
      <div class="relative mt-10 flex flex-wrap items-center gap-4">
        <span class="rounded-full border-2 border-ink bg-paper px-5 py-3 text-sm font-black">{{ t('common.comingSoon') }}</span>
        <NuxtLink :to="localePath('/')" class="focus-ring rounded-full px-3 py-2 text-sm font-black underline decoration-2 underline-offset-4">
          {{ t('common.arrowLeft') }} {{ t('common.backHome') }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

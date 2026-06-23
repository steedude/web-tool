<script setup lang="ts">
defineProps<{
  accent: string
  badge: string
  description: string
  index: string
  title: string
  to: string
}>()

const { t } = useI18n()
</script>

<template>
  <NuxtLink
    :to="to"
    class="focus-ring group relative flex min-h-64 flex-col overflow-hidden rounded-[2rem] border-2 border-ink bg-white p-6 shadow-[7px_7px_0_#171714] transition duration-300 hover:-translate-y-2 hover:shadow-[11px_11px_0_#171714] sm:min-h-72 sm:p-8"
  >
    <div :class="accent" class="absolute -top-14 -right-14 size-44 rounded-full border-2 border-ink transition duration-500 group-hover:scale-125" />

    <div class="relative flex items-start justify-between gap-4">
      <span class="font-mono text-sm font-black">{{ index }}</span>
      <span class="rounded-full border-2 border-ink bg-paper px-3 py-1 font-mono text-[10px] font-black tracking-widest">
        {{ badge }}
      </span>
    </div>

    <div class="relative mt-auto pt-20">
      <h2 class="max-w-xs text-3xl leading-none font-black tracking-[-0.04em] sm:text-4xl">
        {{ title }}
      </h2>
      <p class="mt-4 max-w-sm text-sm leading-6 font-semibold text-black/60">
        {{ description }}
      </p>
      <div class="mt-6 inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase">
        <slot name="action" />
        <span class="grid size-8 place-items-center rounded-full border-2 border-ink transition group-hover:translate-x-1 group-hover:bg-ink group-hover:text-white">{{ t('common.arrowRight') }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
const { locale, setLocale, t } = useI18n()
const localePath = useLocalePath()

function toggleLocale() {
  setLocale(locale.value === 'zh-TW' ? 'en' : 'zh-TW')
}
</script>

<template>
  <div class="min-h-screen text-ink">
    <div class="noise" />
    <header class="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8 lg:px-12">
      <NuxtLink :to="localePath('/')" class="focus-ring group inline-flex items-center gap-3 rounded-full">
        <span class="grid size-10 rotate-3 place-items-center rounded-xl border-2 border-ink bg-acid text-sm font-black shadow-[3px_3px_0_#171714] transition group-hover:-rotate-3">
          38
        </span>
        <span class="hidden text-sm font-black tracking-[0.16em] uppercase sm:block">{{ t('brand') }}</span>
      </NuxtLink>

      <div class="flex items-center gap-3">
        <span class="hidden items-center gap-2 text-xs font-bold sm:flex">
          <span class="size-2 animate-pulse rounded-full bg-emerald-500" />
          {{ t('systemOnline') }}
        </span>
        <button
          type="button"
          class="focus-ring rounded-full border-2 border-ink bg-white px-4 py-2 text-xs font-black shadow-[3px_3px_0_#171714] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#171714]"
          @click="toggleLocale"
        >
          {{ locale === 'zh-TW' ? 'EN' : '中' }}
        </button>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>

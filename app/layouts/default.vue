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
    <header class="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
      <NuxtLink :to="localePath('/')" class="focus-ring group inline-flex items-center gap-3 rounded-full">
        <span class="grid size-10 rotate-3 place-items-center rounded-xl border-2 border-ink bg-acid text-sm font-black shadow-control transition group-hover:-rotate-3">
          {{ t('common.logoMark') }}
        </span>
        <span class="hidden text-sm font-black tracking-[0.16em] uppercase lg:block">{{ t('brand') }}</span>
      </NuxtLink>

      <div class="flex items-center gap-3">
        <button
          type="button"
          class="ui-button rounded-full bg-white py-2 text-xs shadow-control hover:-translate-y-0.5 hover:shadow-control"
          @click="toggleLocale"
        >
          {{ locale === 'zh-TW' ? t('common.switchToEnglish') : t('common.switchToChinese') }}
        </button>
      </div>
    </header>

    <main>
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: () => t('home.metaTitle', { brand: t('brand') }),
  description: () => t('home.description'),
  schema: () => ({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    'name': t('brand'),
    'url': 'https://tool.3854335.com',
    'applicationCategory': 'UtilityApplication',
    'operatingSystem': 'Web',
    'description': t('home.description'),
  }),
})

const features = useHomeFeatureTranslations(localePath)
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-5 pt-12 pb-20 lg:px-12 lg:pt-20">
    <section class="max-w-5xl">
      <p class="font-mono text-xs font-black tracking-[0.22em] text-black/50 uppercase">
        {{ t('home.eyebrow') }}
      </p>
      <h1 class="mt-5 text-5xl leading-[0.92] font-black tracking-[-0.07em] lg:text-[6.8rem]">
        {{ t('home.title') }}
      </h1>
      <p class="mt-7 max-w-2xl text-base leading-7 font-semibold text-black/60 lg:text-lg">
        {{ t('home.description') }}
      </p>
    </section>

    <div class="mt-16 flex items-center gap-4">
      <span class="font-mono text-xs font-black tracking-widest uppercase">{{ t('home.choose') }}</span>
      <span class="h-px flex-1 bg-ink/20" />
    </div>

    <section class="mt-7 grid gap-6 lg:grid-cols-3">
      <FeatureCard v-for="feature in features" :key="feature.index" v-bind="feature">
        <template #action>
          {{ t('common.openFeature') }}
        </template>
      </FeatureCard>
    </section>
  </div>
</template>

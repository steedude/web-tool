<script setup lang="ts">
import { LinkMode } from '~/types/link.type'

const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: () => `${t('features.links.title')} — ${t('brand')}`,
  description: () => t('links.description'),
})
const {
  copied,
  copyShortUrl,
  createLink,
  created,
  createdPreviewImage,
  creating,
  errorMessage,
  markPreviewFailed,
  qrCode,
  resetResult,
  shouldShowCreatedPreviewImage,
} = useLinkCreator()

const imageDraft = ref({
  description: '',
  imageUrl: '',
  mode: LinkMode.Url,
  title: '',
})
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-5 py-10 lg:px-8 lg:py-16">
    <NuxtLink :to="localePath('/')" class="focus-ring inline-flex font-bold hover:underline">
      {{ t('common.backHome') }}
    </NuxtLink>

    <div class="mt-10 grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
      <section>
        <p class="text-sm font-black tracking-[.24em]">
          {{ t('links.eyebrow') }}
        </p>
        <h1 class="mt-5 text-5xl leading-[.95] font-black tracking-[-.055em] lg:text-7xl">
          {{ t('links.title') }}
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-8">
          {{ t('links.description') }}
        </p>

        <LinksLinkCreateForm
          :creating="creating"
          :error-message="errorMessage"
          @dirty="resetResult"
          @draft-change="imageDraft = $event"
          @submit="createLink"
        />
      </section>

      <section class="lg:pt-12">
        <LinksLinkResultCard
          v-if="created"
          :copied="copied"
          :created="created"
          :image-url="createdPreviewImage"
          :qr-code="qrCode"
          :show-preview-image="shouldShowCreatedPreviewImage"
          @copy="copyShortUrl"
          @image-error="markPreviewFailed"
        />
        <LinksLinkImageDraftPreview
          v-else-if="imageDraft.mode === LinkMode.Image && imageDraft.imageUrl"
          :description="imageDraft.description"
          :image-url="imageDraft.imageUrl"
          :title="imageDraft.title"
        />
        <LinksLinkEmptyPreview v-else />
      </section>
    </div>
  </main>
</template>

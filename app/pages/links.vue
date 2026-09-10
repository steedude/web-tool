<script setup lang="ts">
import { LinkMode } from '~/configs/link.config'

const { t } = useI18n()

usePageSeo({
  title: () => `${t('features.links.title')} — ${t('brand')}`,
  description: () => t('links.description'),
})
const {
  copied,
  copyFailed,
  copyShortUrl,
  createLink,
  created,
  createdPreviewImage,
  creating,
  errorMessage,
  markPreviewFailed,
  qrCode,
  qrFailed,
  retryQrCode,
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
  <PageContainer>
    <AppBackLink />

    <div class="mt-10 grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
      <section>
        <PageHeader :eyebrow="t('links.eyebrow')" :title="t('links.title')" :description="t('links.description')" />

        <LinksLinkCreateForm
          :creating="creating"
          :error-message="errorMessage"
          @dirty="resetResult"
          @draft-change="imageDraft = $event"
          @submit="createLink"
        />
      </section>

      <section class="space-y-4 lg:pt-12">
        <AppShareFeedback :copy-failed="copyFailed" :qr-failed="qrFailed" @retry-qr="retryQrCode" />
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
  </PageContainer>
</template>

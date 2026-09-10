<script setup lang="ts">
import type { CreatedLink } from '~/types/link.type'
import { LinkMode } from '~/configs/link.config'
import { getHostname } from '~/utils/link.util'

const props = defineProps<{
  copied: boolean
  created: CreatedLink
  imageUrl: string
  qrCode: string
  showPreviewImage: boolean
}>()

defineEmits<{
  copy: []
  imageError: []
}>()

const { t } = useI18n()
const hostname = computed(() => getHostname(props.created.target_url))
const isImage = computed(() => props.created.mode === LinkMode.Image)
</script>

<template>
  <div class="rounded-panel border-2 border-ink bg-acid p-5 shadow-panel lg:p-7">
    <p class="text-xs font-black tracking-[.2em]">
      {{ t('links.result.eyebrow') }}
    </p>
    <a :href="created.shortUrl" target="_blank" class="focus-ring mt-3 block break-all text-3xl font-black underline lg:text-4xl">{{ created.shortUrl }}</a>
    <div class="mt-5 overflow-hidden border-2 border-ink bg-white">
      <div class="aspect-[1200/630] overflow-hidden border-b-2 border-ink bg-violet/20">
        <img v-if="showPreviewImage" :src="imageUrl" :alt="created.title || created.target_url" class="h-full w-full" :class="isImage ? 'object-contain p-3' : 'object-cover object-top'" @error="$emit('imageError')">
        <div v-else class="grid h-full place-items-center bg-gradient-to-br from-acid via-paper to-sky/30 p-8 text-center">
          <div>
            <div class="text-6xl font-black">
              {{ t('common.previewIcon') }}
            </div>
            <p class="mt-4 text-xs font-black tracking-[.2em] text-ink/50">
              {{ t('links.result.defaultPreviewEyebrow') }}
            </p>
            <p class="mt-2 line-clamp-2 break-all text-2xl font-black">
              {{ hostname || created.target_url }}
            </p>
          </div>
        </div>
      </div>
      <div class="p-4">
        <div class="flex items-center gap-2 text-xs font-bold text-ink/55">
          <img v-if="created.favicon_url" :src="created.favicon_url" alt="" class="size-5" @error="($event.target as HTMLImageElement).style.display = 'none'">
          <span>{{ hostname }}</span>
        </div>
        <h2 class="mt-2 line-clamp-2 break-all text-xl font-black wrap-anywhere">
          {{ created.title || created.target_url }}
        </h2>
        <p v-if="created.description" class="mt-2 line-clamp-3 break-all text-sm leading-6 text-ink/70 wrap-anywhere">
          {{ created.description }}
        </p>
      </div>
    </div>
    <div class="mt-6 grid items-start gap-5 lg:grid-cols-[170px_1fr]">
      <img v-if="qrCode" :src="qrCode" :alt="t('links.result.qrAlt')" class="w-full border-2 border-ink bg-white p-2">
      <div class="space-y-4">
        <p v-if="created.password_required" class="inline-flex border border-ink bg-white px-2 py-1 text-xs font-black">
          {{ t('links.result.passwordProtected') }}
        </p>
        <div>
          <button class="ui-button bg-white px-5" @click="$emit('copy')">
            {{ copied ? t('links.actions.copied') : t('links.actions.copyShortUrl') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

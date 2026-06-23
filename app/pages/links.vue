<script setup lang="ts">
import type { CreatedLink } from '~/types/link.type'
import QRCode from 'qrcode'
import { LINK_EXPIRY_OPTIONS, LINK_FORM_LIMITS, LINK_QR_CONFIG, LinkExpiryDay } from '~/configs/link.config'
import { getApiErrorMessage } from '~/utils/error.util'
import { getHostname, getPreviewImage, getWebsiteScreenshotUrl } from '~/utils/link.util'

type LinkMode = 'url' | 'image'

const mode = ref<LinkMode>('url')
const url = ref('')
const password = ref('')
const showPassword = ref(false)
const imageTitle = ref('')
const imageDescription = ref('')
const selectedImage = ref<File | null>(null)
const selectedImagePreview = ref('')
const expiresInDays = ref<LinkExpiryDay>(LinkExpiryDay.Forever)
const created = ref<CreatedLink | null>(null)
const qrCode = ref('')
const creating = ref(false)
const errorMessage = ref('')
const copied = ref(false)
const createdPreviewFailed = ref(false)
const { t } = useI18n()
const localePath = useLocalePath()

const createdHostname = computed(() => created.value ? getHostname(created.value.target_url) : '')
const createdIsImage = computed(() => Boolean(created.value?.target_url.includes('/image/')))
const createdPreviewImage = computed(() => {
  if (!created.value)
    return ''
  if (createdIsImage.value)
    return getPreviewImage(created.value.image_url, created.value.screenshot_url)
  return getPreviewImage(created.value.image_url, created.value.screenshot_url) || getWebsiteScreenshotUrl(created.value.target_url)
})
const shouldShowCreatedPreviewImage = computed(() => Boolean(createdPreviewImage.value && !createdPreviewFailed.value))
const canCreate = computed(() => mode.value === 'url' ? Boolean(url.value.trim()) : Boolean(selectedImage.value))

function limitText(value: string, maxLength: number) {
  return value.trim().slice(0, maxLength)
}

function characterCount(value: string, maxLength: number) {
  return `${value.length}/${maxLength}`
}

function isValidHttpUrlInput(value: string) {
  try {
    const candidate = new URL(value.trim())
    return ['http:', 'https:'].includes(candidate.protocol)
  }
  catch {
    return false
  }
}

function clearImagePreview() {
  if (selectedImagePreview.value)
    URL.revokeObjectURL(selectedImagePreview.value)
  selectedImage.value = null
  selectedImagePreview.value = ''
}

function resetForm() {
  url.value = ''
  password.value = ''
  showPassword.value = false
  imageTitle.value = ''
  imageDescription.value = ''
  expiresInDays.value = LinkExpiryDay.Forever
  created.value = null
  qrCode.value = ''
  errorMessage.value = ''
  copied.value = false
  createdPreviewFailed.value = false
  clearImagePreview()
}

function setMode(nextMode: LinkMode) {
  if (mode.value === nextMode)
    return
  mode.value = nextMode
  resetForm()
}

async function createUrlLink() {
  if (!isValidHttpUrlInput(url.value)) {
    errorMessage.value = getApiErrorMessage({ data: { code: 'INVALID_URL' } }, t, 'errors.INVALID_URL')
    return
  }

  created.value = await $fetch<CreatedLink>('/api/links', {
    method: 'POST',
    body: {
      expiresInDays: expiresInDays.value,
      password: limitText(password.value, LINK_FORM_LIMITS.password) || undefined,
      url: url.value.trim(),
    },
  })
}

async function createImageLink() {
  if (!selectedImage.value)
    return

  const body = new FormData()
  body.append('image', selectedImage.value)
  body.append('password', limitText(password.value, LINK_FORM_LIMITS.password))
  body.append('title', limitText(imageTitle.value, LINK_FORM_LIMITS.title))
  body.append('description', limitText(imageDescription.value, LINK_FORM_LIMITS.description))
  body.append('expiresInDays', String(expiresInDays.value))
  created.value = await $fetch<CreatedLink>('/api/links/image', {
    method: 'POST',
    body,
  })
}

async function createLink() {
  creating.value = true
  errorMessage.value = ''
  try {
    createdPreviewFailed.value = false
    if (mode.value === 'url')
      await createUrlLink()
    else
      await createImageLink()

    if (created.value)
      qrCode.value = await QRCode.toDataURL(created.value.shortUrl, LINK_QR_CONFIG)
  }
  catch (error: any) {
    errorMessage.value = getApiErrorMessage(error, t, 'errors.CREATE_LINK_FAILED')
  }
  finally {
    creating.value = false
  }
}

function onImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  clearImagePreview()
  selectedImage.value = file
  selectedImagePreview.value = file ? URL.createObjectURL(file) : ''
  created.value = null
  errorMessage.value = ''
}

async function copyShortUrl() {
  if (!created.value)
    return
  await navigator.clipboard.writeText(created.value.shortUrl)
  copied.value = true
  setTimeout(() => copied.value = false, 1500)
}

watch(url, () => {
  if (mode.value !== 'url')
    return
  created.value = null
  qrCode.value = ''
  copied.value = false
  createdPreviewFailed.value = false
})

onBeforeUnmount(clearImagePreview)
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-16">
    <NuxtLink :to="localePath('/')" class="focus-ring inline-flex font-bold hover:underline">
      {{ t('common.backHome') }}
    </NuxtLink>

    <div class="mt-10 grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
      <section>
        <p class="text-sm font-black tracking-[.24em]">
          {{ t('links.eyebrow') }}
        </p>
        <h1 class="mt-5 text-5xl leading-[.95] font-black tracking-[-.055em] sm:text-7xl">
          {{ t('links.title') }}
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-8">
          {{ t('links.description') }}
        </p>

        <form class="mt-9 border-2 border-ink bg-white p-5 shadow-[8px_8px_0_#ad9cff] sm:p-7" @submit.prevent="createLink">
          <div class="grid grid-cols-2 gap-2 rounded-full border-2 border-ink bg-paper p-1">
            <button type="button" class="rounded-full px-4 py-3 text-sm font-black" :class="mode === 'url' ? 'bg-ink text-white' : 'bg-transparent'" @click="setMode('url')">
              {{ t('links.mode.url') }}
            </button>
            <button type="button" class="rounded-full px-4 py-3 text-sm font-black" :class="mode === 'image' ? 'bg-ink text-white' : 'bg-transparent'" @click="setMode('image')">
              {{ t('links.mode.image') }}
            </button>
          </div>

          <template v-if="mode === 'url'">
            <label class="mt-5 block text-sm font-black" for="target-url">{{ t('links.fields.targetUrl') }}</label>
            <input id="target-url" v-model="url" required type="text" :placeholder="t('links.placeholders.targetUrl')" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4">
          </template>

          <template v-else>
            <label class="mt-5 block text-sm font-black" for="image-file">{{ t('links.fields.uploadImage') }}</label>
            <input id="image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4" @change="onImageChange">
            <p class="mt-2 text-xs font-bold text-ink/55">
              {{ t('links.hints.imageTypes') }}
            </p>
            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <label class="text-sm font-black">
                <span class="flex items-center justify-between gap-3">
                  <span>{{ t('links.fields.imageTitle') }}</span>
                  <span class="text-xs text-ink/45">{{ characterCount(imageTitle, LINK_FORM_LIMITS.title) }}</span>
                </span>
                <input v-model="imageTitle" type="text" :maxlength="LINK_FORM_LIMITS.title" :placeholder="t('links.placeholders.imageTitle')" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4">
              </label>
              <label class="text-sm font-black">
                <span class="flex items-center justify-between gap-3">
                  <span>{{ t('links.fields.imageDescription') }}</span>
                  <span class="text-xs text-ink/45">{{ characterCount(imageDescription, LINK_FORM_LIMITS.description) }}</span>
                </span>
                <input v-model="imageDescription" type="text" :maxlength="LINK_FORM_LIMITS.description" :placeholder="t('links.placeholders.imageDescription')" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4">
              </label>
            </div>
          </template>

          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="text-sm font-black">{{ t('links.fields.expiry') }}
              <select v-model="expiresInDays" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-3 py-3">
                <option v-for="option in LINK_EXPIRY_OPTIONS" :key="option.value" :value="option.value">
                  {{ t(option.labelKey) }}
                </option>
              </select>
            </label>
            <label class="text-sm font-black">
              <span class="flex items-center justify-between gap-3">
                <span>{{ t('links.fields.password') }}</span>
                <span class="text-xs text-ink/45">{{ characterCount(password, LINK_FORM_LIMITS.password) }}</span>
              </span>
              <span class="mt-2 flex border-2 border-ink bg-paper">
                <input v-model="password" :type="showPassword ? 'text' : 'password'" :maxlength="LINK_FORM_LIMITS.password" autocomplete="new-password" :placeholder="t('links.placeholders.password')" class="focus-ring min-w-0 flex-1 bg-transparent px-4 py-3 outline-none">
                <button type="button" class="border-l-2 border-ink px-3 text-xs font-black" :aria-label="showPassword ? t('common.hidePassword') : t('common.showPassword')" @click="showPassword = !showPassword">
                  {{ showPassword ? t('common.hidePassword') : t('common.showPassword') }}
                </button>
              </span>
            </label>
          </div>

          <p v-if="errorMessage" class="mt-4 border-l-4 border-coral bg-coral/15 px-4 py-3 text-sm font-bold">
            {{ errorMessage }}
          </p>

          <button class="focus-ring mt-6 w-full border-2 border-ink bg-ink px-5 py-4 text-lg font-black text-white disabled:opacity-40" :disabled="creating || !canCreate">
            {{ creating ? t('links.actions.creating') : mode === 'url' ? t('links.actions.createUrl') : t('links.actions.createImage') }}
          </button>
        </form>
      </section>

      <section class="lg:pt-12">
        <div v-if="created" class="border-2 border-ink bg-acid p-5 shadow-[8px_8px_0_#171714] sm:p-7">
          <p class="text-xs font-black tracking-[.2em]">
            {{ t('links.result.eyebrow') }}
          </p>
          <a :href="created.shortUrl" target="_blank" class="focus-ring mt-3 block break-all text-3xl font-black underline sm:text-4xl">{{ created.shortUrl }}</a>
          <div class="mt-5 overflow-hidden border-2 border-ink bg-white">
            <div class="aspect-[1200/630] overflow-hidden border-b-2 border-ink bg-violet/20">
              <img v-if="shouldShowCreatedPreviewImage" :src="createdPreviewImage" :alt="created.title || created.target_url" class="h-full w-full" :class="createdIsImage ? 'object-contain p-3' : 'object-cover object-top'" @error="createdPreviewFailed = true">
              <div v-else class="grid h-full place-items-center bg-gradient-to-br from-acid via-paper to-sky/30 p-8 text-center">
                <div>
                  <div class="text-6xl font-black">
                    {{ t('common.previewIcon') }}
                  </div>
                  <p class="mt-4 text-xs font-black tracking-[.2em] text-ink/50">
                    {{ t('links.result.defaultPreviewEyebrow') }}
                  </p>
                  <p class="mt-2 line-clamp-2 break-all text-2xl font-black">
                    {{ createdHostname || created.target_url }}
                  </p>
                </div>
              </div>
            </div>
            <div class="p-4">
              <div class="flex items-center gap-2 text-xs font-bold text-ink/55">
                <img v-if="created.favicon_url" :src="created.favicon_url" alt="" class="size-5" @error="($event.target as HTMLImageElement).style.display = 'none'">
                <span>{{ createdHostname }}</span>
              </div>
              <h2 class="mt-2 line-clamp-2 break-words text-xl font-black">
                {{ created.title || created.target_url }}
              </h2>
              <p v-if="created.description" class="mt-2 line-clamp-3 break-words text-sm leading-6 text-ink/70">
                {{ created.description }}
              </p>
            </div>
          </div>
          <div class="mt-6 grid items-start gap-5 sm:grid-cols-[170px_1fr]">
            <img :src="qrCode" :alt="t('links.result.qrAlt')" class="w-full border-2 border-ink bg-white p-2">
            <div class="space-y-4">
              <p v-if="created.password_required" class="inline-flex border border-ink bg-white px-2 py-1 text-xs font-black">
                {{ t('links.result.passwordProtected') }}
              </p>
              <div>
                <button class="focus-ring border-2 border-ink bg-white px-5 py-3 font-black" @click="copyShortUrl">
                  {{ copied ? t('links.actions.copied') : t('links.actions.copyShortUrl') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="mode === 'image' && selectedImagePreview" class="overflow-hidden border-2 border-ink bg-white shadow-[8px_8px_0_#171714]">
          <div class="aspect-[1200/630] overflow-hidden border-b-2 border-ink bg-violet/20">
            <img :src="selectedImagePreview" :alt="imageTitle || t('links.preview.uploadAlt')" class="h-full w-full object-contain p-3">
          </div>
          <div class="p-5 sm:p-7">
            <p class="text-xs font-black tracking-[.2em]">
              {{ t('links.preview.imageEyebrow') }}
            </p>
            <h2 class="mt-3 line-clamp-2 break-words text-3xl font-black tracking-tight">
              {{ imageTitle || t('image.fallbackTitle') }}
            </h2>
            <p class="mt-3 line-clamp-3 break-words leading-7 text-ink/70">
              {{ imageDescription || t('links.preview.imageDescription') }}
            </p>
          </div>
        </div>

        <div v-else class="grid min-h-[470px] place-items-center border-2 border-dashed border-ink/40 bg-white/45 p-8 text-center">
          <div>
            <div class="text-6xl">
              {{ t('common.previewIcon') }}
            </div>
            <h2 class="mt-5 text-2xl font-black">
              {{ t('links.empty.title') }}
            </h2>
            <p class="mt-2 text-ink/60">
              {{ t('links.empty.description') }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

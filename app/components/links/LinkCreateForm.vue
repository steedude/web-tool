<script setup lang="ts">
import type { LinkCreateFormPayload } from '~/types/link.type'
import { LINK_FORM_LIMITS, LINK_IMAGE_UPLOAD_TYPES, LinkExpiryDay, LinkMode } from '~/configs/link.config'
import { getCharacterCount } from '~/utils/link.util'

defineProps<{
  creating: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  dirty: []
  draftChange: [draft: { description: string, imageUrl: string, mode: LinkMode, title: string }]
  submit: [payload: LinkCreateFormPayload]
}>()

const { t } = useI18n()
const mode = ref<LinkMode>(LinkMode.Url)
const url = ref('')
const password = ref('')
const imageTitle = ref('')
const imageDescription = ref('')
const expiresInDays = ref<LinkExpiryDay>(LinkExpiryDay.Forever)
const selectedImage = ref<File | null>(null)
const selectedImagePreview = ref('')

const expiryOptions = useLinkExpiryTranslations()
const canCreate = computed(() => mode.value === LinkMode.Url ? Boolean(url.value.trim()) : Boolean(selectedImage.value))

function setMode(nextMode: LinkMode) {
  if (mode.value === nextMode)
    return

  mode.value = nextMode
  resetForm()
  emitDirty()
}

function onImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  clearImagePreview()
  selectedImage.value = input.files?.[0] || null
  selectedImagePreview.value = selectedImage.value ? URL.createObjectURL(selectedImage.value) : ''
  emitDraftChange()
  emitDirty()
}

function submitForm() {
  emit('submit', {
    expiresInDays: expiresInDays.value,
    image: selectedImage.value,
    imageDescription: imageDescription.value,
    imageTitle: imageTitle.value,
    mode: mode.value,
    password: password.value,
    url: url.value,
  })
}

function emitDirty() {
  emit('dirty')
}

function emitDraftChange() {
  emit('draftChange', {
    description: imageDescription.value,
    imageUrl: selectedImagePreview.value,
    mode: mode.value,
    title: imageTitle.value,
  })
}

function clearImagePreview() {
  if (selectedImagePreview.value)
    URL.revokeObjectURL(selectedImagePreview.value)
  selectedImagePreview.value = ''
  selectedImage.value = null
}

function resetForm() {
  url.value = ''
  password.value = ''
  imageTitle.value = ''
  imageDescription.value = ''
  expiresInDays.value = LinkExpiryDay.Forever
  clearImagePreview()
  emitDraftChange()
}

watch([url, password, expiresInDays], emitDirty)
watch([imageTitle, imageDescription], () => {
  emitDraftChange()
  emitDirty()
})

onBeforeUnmount(clearImagePreview)
</script>

<template>
  <form class="rounded-panel mt-9 border-2 border-ink bg-white p-5 shadow-accent lg:p-7" @submit.prevent="submitForm">
    <div class="grid grid-cols-2 gap-2 rounded-full border-2 border-ink bg-paper p-1">
      <button type="button" class="ui-button rounded-full text-sm" :class="mode === LinkMode.Url ? 'bg-ink text-white' : 'bg-transparent'" @click="setMode(LinkMode.Url)">
        {{ t('links.mode.url') }}
      </button>
      <button type="button" class="ui-button rounded-full text-sm" :class="mode === LinkMode.Image ? 'bg-ink text-white' : 'bg-transparent'" @click="setMode(LinkMode.Image)">
        {{ t('links.mode.image') }}
      </button>
    </div>

    <template v-if="mode === LinkMode.Url">
      <label class="mt-5 block text-sm font-black" for="target-url">{{ t('links.fields.targetUrl') }}</label>
      <input id="target-url" v-model="url" required type="text" :placeholder="t('links.placeholders.targetUrl')" class="ui-input mt-2 w-full py-4">
    </template>

    <template v-else>
      <label class="mt-5 block text-sm font-black" for="image-file">{{ t('links.fields.uploadImage') }}</label>
      <input id="image-file" type="file" :accept="[...LINK_IMAGE_UPLOAD_TYPES].join(',')" class="ui-input mt-2 w-full py-4" @change="onImageChange">
      <p class="mt-2 text-xs font-bold text-ink/55">
        {{ t('links.hints.imageTypes') }}
      </p>
      <div class="mt-5 grid gap-4 lg:grid-cols-2">
        <label class="min-w-0 text-sm font-black">
          <span class="flex items-center justify-between gap-3">
            <span>{{ t('links.fields.imageTitle') }}</span>
            <span class="text-xs text-ink/45">{{ getCharacterCount(imageTitle, LINK_FORM_LIMITS.title) }}</span>
          </span>
          <input v-model="imageTitle" type="text" :maxlength="LINK_FORM_LIMITS.title" :placeholder="t('links.placeholders.imageTitle')" class="ui-input mt-2 w-full py-4">
        </label>
        <label class="min-w-0 text-sm font-black">
          <span class="flex items-center justify-between gap-3">
            <span>{{ t('links.fields.imageDescription') }}</span>
            <span class="text-xs text-ink/45">{{ getCharacterCount(imageDescription, LINK_FORM_LIMITS.description) }}</span>
          </span>
          <input v-model="imageDescription" type="text" :maxlength="LINK_FORM_LIMITS.description" :placeholder="t('links.placeholders.imageDescription')" class="ui-input mt-2 w-full py-4">
        </label>
      </div>
    </template>

    <div class="mt-5 grid gap-4 lg:grid-cols-2">
      <label class="text-sm font-black">{{ t('links.fields.expiry') }}
        <select v-model="expiresInDays" class="ui-input mt-2 w-full px-3">
          <option v-for="option in expiryOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </label>
      <label class="min-w-0 text-sm font-black">
        <span class="flex items-center justify-between gap-3">
          <span>{{ t('links.fields.password') }}</span>
          <span class="text-xs text-ink/45">{{ getCharacterCount(password, LINK_FORM_LIMITS.password) }}</span>
        </span>
        <AppPasswordInput :key="mode" v-model="password" :placeholder="t('links.placeholders.password')" />
      </label>
    </div>

    <AppAlert v-if="errorMessage" class="mt-4">
      {{ errorMessage }}
    </AppAlert>

    <button class="ui-button ui-button-primary mt-6 w-full px-5 py-4 text-lg" :disabled="creating || !canCreate">
      {{ creating ? t('links.actions.creating') : mode === LinkMode.Url ? t('links.actions.createUrl') : t('links.actions.createImage') }}
    </button>
  </form>
</template>

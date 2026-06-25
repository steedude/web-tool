<script setup lang="ts">
import type { LinkExpiryDay } from '~/configs/link.config'
import { createLinkExpiryOptions, LINK_FORM_LIMITS } from '~/configs/link.config'
import { LinkMode } from '~/types/link.type'
import { getCharacterCount } from '~/utils/link.util'

defineProps<{
  canCreate: boolean
  creating: boolean
  errorMessage: string
  showPassword: boolean
}>()

defineEmits<{
  imageChange: [event: Event]
  modeChange: [mode: LinkMode]
  submit: []
  togglePassword: []
}>()

const mode = defineModel<LinkMode>('mode', { required: true })
const url = defineModel<string>('url', { required: true })
const password = defineModel<string>('password', { required: true })
const imageTitle = defineModel<string>('imageTitle', { required: true })
const imageDescription = defineModel<string>('imageDescription', { required: true })
const expiresInDays = defineModel<LinkExpiryDay>('expiresInDays', { required: true })
const { t } = useI18n()
const expiryOptions = computed(() => createLinkExpiryOptions(t))
</script>

<template>
  <form class="mt-9 border-2 border-ink bg-white p-5 shadow-[8px_8px_0_#ad9cff] sm:p-7" @submit.prevent="$emit('submit')">
    <div class="grid grid-cols-2 gap-2 rounded-full border-2 border-ink bg-paper p-1">
      <button type="button" class="rounded-full px-4 py-3 text-sm font-black" :class="mode === LinkMode.Url ? 'bg-ink text-white' : 'bg-transparent'" @click="$emit('modeChange', LinkMode.Url)">
        {{ t('links.mode.url') }}
      </button>
      <button type="button" class="rounded-full px-4 py-3 text-sm font-black" :class="mode === LinkMode.Image ? 'bg-ink text-white' : 'bg-transparent'" @click="$emit('modeChange', LinkMode.Image)">
        {{ t('links.mode.image') }}
      </button>
    </div>

    <template v-if="mode === LinkMode.Url">
      <label class="mt-5 block text-sm font-black" for="target-url">{{ t('links.fields.targetUrl') }}</label>
      <input id="target-url" v-model="url" required type="text" :placeholder="t('links.placeholders.targetUrl')" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4">
    </template>

    <template v-else>
      <label class="mt-5 block text-sm font-black" for="image-file">{{ t('links.fields.uploadImage') }}</label>
      <input id="image-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4" @change="$emit('imageChange', $event)">
      <p class="mt-2 text-xs font-bold text-ink/55">
        {{ t('links.hints.imageTypes') }}
      </p>
      <div class="mt-5 grid gap-4 md:grid-cols-2">
        <label class="min-w-0 text-sm font-black">
          <span class="flex items-center justify-between gap-3">
            <span>{{ t('links.fields.imageTitle') }}</span>
            <span class="text-xs text-ink/45">{{ getCharacterCount(imageTitle, LINK_FORM_LIMITS.title) }}</span>
          </span>
          <input v-model="imageTitle" type="text" :maxlength="LINK_FORM_LIMITS.title" :placeholder="t('links.placeholders.imageTitle')" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4">
        </label>
        <label class="min-w-0 text-sm font-black">
          <span class="flex items-center justify-between gap-3">
            <span>{{ t('links.fields.imageDescription') }}</span>
            <span class="text-xs text-ink/45">{{ getCharacterCount(imageDescription, LINK_FORM_LIMITS.description) }}</span>
          </span>
          <input v-model="imageDescription" type="text" :maxlength="LINK_FORM_LIMITS.description" :placeholder="t('links.placeholders.imageDescription')" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4">
        </label>
      </div>
    </template>

    <div class="mt-5 grid gap-4 md:grid-cols-2">
      <label class="text-sm font-black">{{ t('links.fields.expiry') }}
        <select v-model="expiresInDays" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-3 py-3">
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
        <span class="mt-2 flex border-2 border-ink bg-paper">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" :maxlength="LINK_FORM_LIMITS.password" autocomplete="new-password" :placeholder="t('links.placeholders.password')" class="focus-ring min-w-0 flex-1 bg-transparent px-4 py-3 outline-none">
          <button type="button" class="border-l-2 border-ink px-3 text-xs font-black" :aria-label="showPassword ? t('common.hidePassword') : t('common.showPassword')" @click="$emit('togglePassword')">
            {{ showPassword ? t('common.hidePassword') : t('common.showPassword') }}
          </button>
        </span>
      </label>
    </div>

    <p v-if="errorMessage" class="mt-4 border-l-4 border-coral bg-coral/15 px-4 py-3 text-sm font-bold">
      {{ errorMessage }}
    </p>

    <button class="focus-ring mt-6 w-full border-2 border-ink bg-ink px-5 py-4 text-lg font-black text-white disabled:opacity-40" :disabled="creating || !canCreate">
      {{ creating ? t('links.actions.creating') : mode === LinkMode.Url ? t('links.actions.createUrl') : t('links.actions.createImage') }}
    </button>
  </form>
</template>

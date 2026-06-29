<script setup lang="ts">
import type { ImageLinkResolve } from '~/types/link.type'
import { LINK_FORM_LIMITS } from '~/configs/link.config'

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').toLowerCase())
const password = ref('')
const showPassword = ref(false)
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const image = ref<ImageLinkResolve | null>(null)
const { t } = useI18n()
const getApiErrorMessage = useApiErrorMessage()
const localePath = useLocalePath()

usePageSeo({
  title: () => `${t('image.fallbackTitle')} — ${t('brand')}`,
  description: () => t('image.protectedDescription'),
  noindex: true,
})

const needsPassword = computed(() => image.value?.status === 'password_required')
const isResolved = computed(() => image.value?.status === 'resolved' && image.value.image_url)
const isExpired = computed(() => image.value?.status === 'expired')
const isNotFound = computed(() => image.value?.status === 'not_found')

const passwordCount = computed(() => `${password.value.length}/${LINK_FORM_LIMITS.password}`)

async function resolveImage(passwordAttempt = '') {
  errorMessage.value = ''
  const result = await $fetch<ImageLinkResolve>(`/api/images/${slug.value}`, {
    method: 'POST',
    body: { password: passwordAttempt || undefined },
  })
  image.value = result
}

async function submitPassword() {
  submitting.value = true
  try {
    await resolveImage(password.value)
    if (needsPassword.value)
      errorMessage.value = t('image.errors.wrongPassword')
    else
      password.value = ''
  }
  catch (error: any) {
    errorMessage.value = getApiErrorMessage(error)
  }
  finally {
    submitting.value = false
  }
}

onMounted(async () => {
  try {
    await resolveImage()
  }
  catch (error: any) {
    errorMessage.value = getApiErrorMessage(error)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="mx-auto min-h-[calc(100vh-96px)] w-full max-w-6xl px-5 py-10 lg:px-8 lg:py-16">
    <NuxtLink :to="localePath('/links')" class="focus-ring inline-flex font-bold hover:underline">
      {{ t('image.backToLinks') }}
    </NuxtLink>

    <section class="mt-10 overflow-hidden border-2 border-ink bg-white shadow-[10px_10px_0_#ad9cff]">
      <div class="border-b-2 border-ink bg-paper px-5 py-4 lg:px-7">
        <p class="text-xs font-black tracking-[.22em] text-ink/55">
          {{ t('image.eyebrow') }}
        </p>
      </div>

      <div v-if="loading" class="grid min-h-105 place-items-center p-8 text-center">
        <p class="font-black">
          {{ t('image.loading') }}
        </p>
      </div>

      <div v-else-if="isResolved" class="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
        <div class="grid min-h-105 place-items-center border-b-2 border-ink bg-violet/15 p-5 lg:border-r-2 lg:border-b-0 lg:p-8">
          <img :src="image!.image_url!" :alt="image?.title || t('image.fallbackTitle')" class="max-h-[62vh] max-w-full border-2 border-ink bg-white object-contain shadow-[6px_6px_0_#171714]">
        </div>
        <div class="p-6 lg:p-8">
          <p class="text-xs font-black tracking-[.2em] text-ink/55">
            {{ t('image.unlocked') }}
          </p>
          <h1 class="mt-4 break-all text-4xl leading-none font-black tracking-[-.055em] wrap-anywhere lg:text-6xl">
            {{ image?.title || t('image.fallbackTitle') }}
          </h1>
          <p v-if="image?.description" class="mt-5 break-all text-lg leading-8 text-ink/70 wrap-anywhere">
            {{ image.description }}
          </p>
          <p v-if="image?.password_required" class="mt-6 border-l-4 border-sky bg-sky/20 px-4 py-3 text-sm font-bold">
            {{ t('image.refreshNote') }}
          </p>
        </div>
      </div>

      <form v-else-if="needsPassword" class="mx-auto max-w-md p-6 lg:p-10" @submit.prevent="submitPassword">
        <h1 class="text-4xl leading-none font-black tracking-[-.055em]">
          {{ t('image.protectedTitle') }}
        </h1>
        <p class="mt-4 leading-7 text-ink/70">
          {{ t('image.protectedDescription') }}
        </p>
        <label class="mt-6 block text-sm font-black">
          <span class="flex items-center justify-between gap-3">
            <span>{{ t('image.passwordLabel') }}</span>
            <span class="text-xs text-ink/45">{{ passwordCount }}</span>
          </span>
          <span class="mt-2 flex border-2 border-ink bg-paper">
            <input v-model="password" :type="showPassword ? 'text' : 'password'" required :maxlength="LINK_FORM_LIMITS.password" autocomplete="current-password" :placeholder="t('image.passwordPlaceholder')" class="focus-ring min-w-0 flex-1 bg-transparent px-4 py-4 outline-none">
            <button type="button" class="border-l-2 border-ink px-3 text-xs font-black" :aria-label="showPassword ? t('common.hidePassword') : t('common.showPassword')" @click="showPassword = !showPassword">
              {{ showPassword ? t('common.hidePassword') : t('common.showPassword') }}
            </button>
          </span>
        </label>
        <p v-if="errorMessage" class="mt-4 border-l-4 border-coral bg-coral/15 px-4 py-3 text-sm font-bold">
          {{ errorMessage }}
        </p>
        <button class="focus-ring mt-5 w-full border-2 border-ink bg-ink px-5 py-4 text-lg font-black text-white disabled:opacity-40" :disabled="submitting">
          {{ submitting ? t('image.verifying') : t('image.viewImage') }}
        </button>
      </form>

      <AppStatusCard
        v-else-if="isExpired"
        :action-label="t('image.backToLinks')"
        :eyebrow="t('image.expiredEyebrow')"
        :message="t('image.expiredDescription')"
        :title="t('image.expiredTitle')"
        :to="localePath('/links')"
      />

      <AppStatusCard
        v-else-if="isNotFound"
        :action-label="t('image.backToLinks')"
        :eyebrow="t('image.notFoundEyebrow')"
        :message="t('image.notFoundDescription')"
        :title="t('image.notFoundTitle')"
        :to="localePath('/links')"
      />

      <div v-else class="grid min-h-90 place-items-center p-8 text-center">
        <div>
          <h1 class="text-4xl font-black">
            {{ t('image.notFoundTitle') }}
          </h1>
          <p class="mt-3 text-ink/60">
            {{ t('image.notFoundDescription') }}
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

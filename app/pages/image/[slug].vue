<script setup lang="ts">
import { LINK_FORM_LIMITS } from '~/configs/link.config'

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').toLowerCase())
const password = ref('')
const submitting = ref(false)
const { errorMessage, image, loadFailed, loading, needsPassword, resolvedImage, resolveImage } = useImageResolver(slug)
const { t } = useI18n()
const localePath = useLocalePath()

usePageSeo({
  title: () => `${t('image.fallbackTitle')} — ${t('brand')}`,
  description: () => t('image.protectedDescription'),
  noindex: true,
})

const isExpired = computed(() => image.value?.status === 'expired')
const isNotFound = computed(() => image.value?.status === 'not_found')

const passwordCount = computed(() => `${password.value.length}/${LINK_FORM_LIMITS.password}`)

async function submitPassword() {
  if (submitting.value)
    return
  submitting.value = true
  const succeeded = await resolveImage(password.value)
  if (succeeded && needsPassword.value)
    errorMessage.value = t('image.errors.wrongPassword')
  else if (succeeded)
    password.value = ''
  submitting.value = false
}

onMounted(() => resolveImage())
</script>

<template>
  <PageContainer width="medium" class="min-h-[calc(100vh-96px)]">
    <AppBackLink to="/links" :label="t('image.backToLinks')" />

    <section class="rounded-panel mt-10 overflow-hidden border-2 border-ink bg-white shadow-accent">
      <div class="border-b-2 border-ink bg-paper px-5 py-4 lg:px-7">
        <p class="text-xs font-black tracking-[.22em] text-ink/55">
          {{ t('image.eyebrow') }}
        </p>
      </div>

      <div v-if="loading && !image" class="grid min-h-105 place-items-center p-8 text-center">
        <p class="font-black">
          {{ t('image.loading') }}
        </p>
      </div>

      <div v-else-if="loadFailed" class="grid min-h-105 place-items-center p-6 lg:p-10">
        <div class="max-w-md text-center">
          <h1 class="text-3xl font-black">
            {{ t('image.loadFailedTitle') }}
          </h1>
          <AppAlert class="mt-5">
            {{ errorMessage }}
          </AppAlert>
          <button type="button" class="ui-button ui-button-primary mt-6" @click="resolveImage()">
            {{ t('common.retry') }}
          </button>
        </div>
      </div>

      <div v-else-if="resolvedImage" class="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
        <div class="grid min-h-105 place-items-center border-b-2 border-ink bg-violet/15 p-5 lg:border-r-2 lg:border-b-0 lg:p-8">
          <img :src="resolvedImage.image_url || undefined" :alt="image?.title || t('image.fallbackTitle')" class="rounded-panel max-h-[62vh] max-w-full border-2 border-ink bg-white object-contain shadow-panel">
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
          <AppPasswordInput v-model="password" required autocomplete="current-password" :placeholder="t('image.passwordPlaceholder')" />
        </label>
        <AppAlert v-if="errorMessage" class="mt-4">
          {{ errorMessage }}
        </AppAlert>
        <button class="ui-button ui-button-primary mt-5 w-full px-5 py-4 text-lg" :disabled="submitting">
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
  </PageContainer>
</template>

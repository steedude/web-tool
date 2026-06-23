<script setup lang="ts">
import type { ImageLinkResolve } from '~/types/link.type'
import { getApiErrorMessage } from '~/utils/error.util'

const route = useRoute()
const slug = computed(() => String(route.params.slug || '').toLowerCase())
const password = ref('')
const loading = ref(true)
const submitting = ref(false)
const errorMessage = ref('')
const image = ref<ImageLinkResolve | null>(null)
const { t } = useI18n()

const needsPassword = computed(() => image.value?.status === 'password_required')
const isResolved = computed(() => image.value?.status === 'resolved' && image.value.image_url)

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
      errorMessage.value = '密碼不正確，請再試一次。'
    else
      password.value = ''
  }
  catch (error: any) {
    errorMessage.value = getApiErrorMessage(error, t)
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
    errorMessage.value = getApiErrorMessage(error, t)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <main class="mx-auto min-h-[calc(100vh-96px)] w-full max-w-6xl px-5 py-10 sm:px-8 lg:py-16">
    <NuxtLink to="/links" class="focus-ring inline-flex font-bold hover:underline">
      ← 回到短網址工具
    </NuxtLink>

    <section class="mt-10 overflow-hidden border-2 border-ink bg-white shadow-[10px_10px_0_#ad9cff]">
      <div class="border-b-2 border-ink bg-paper px-5 py-4 sm:px-7">
        <p class="text-xs font-black tracking-[.22em] text-ink/55">
          PROTECTED IMAGE SHARE
        </p>
      </div>

      <div v-if="loading" class="grid min-h-[420px] place-items-center p-8 text-center">
        <p class="font-black">
          讀取圖片資訊中…
        </p>
      </div>

      <div v-else-if="isResolved" class="grid gap-0 lg:grid-cols-[1.15fr_.85fr]">
        <div class="grid min-h-[420px] place-items-center border-b-2 border-ink bg-violet/15 p-5 lg:border-r-2 lg:border-b-0 sm:p-8">
          <img :src="image!.image_url!" :alt="image?.title || '圖片分享'" class="max-h-[62vh] max-w-full border-2 border-ink bg-white object-contain shadow-[6px_6px_0_#171714]">
        </div>
        <div class="p-6 sm:p-8">
          <p class="text-xs font-black tracking-[.2em] text-ink/55">
            IMAGE UNLOCKED
          </p>
          <h1 class="mt-4 text-4xl leading-none font-black tracking-[-.055em] sm:text-6xl">
            {{ image?.title || '圖片分享' }}
          </h1>
          <p v-if="image?.description" class="mt-5 text-lg leading-8 text-ink/70">
            {{ image.description }}
          </p>
          <p v-if="image?.password_required" class="mt-6 border-l-4 border-sky bg-sky/20 px-4 py-3 text-sm font-bold">
            重新整理頁面後會重新要求密碼。
          </p>
        </div>
      </div>

      <form v-else-if="needsPassword" class="mx-auto max-w-md p-6 sm:p-10" @submit.prevent="submitPassword">
        <h1 class="text-4xl leading-none font-black tracking-[-.055em]">
          這張圖片受到保護
        </h1>
        <p class="mt-4 leading-7 text-ink/70">
          輸入密碼後，圖片會直接顯示在這個頁面。
        </p>
        <input v-model="password" type="password" required autocomplete="current-password" placeholder="輸入密碼" class="focus-ring mt-6 w-full border-2 border-ink bg-paper px-4 py-4">
        <p v-if="errorMessage" class="mt-4 border-l-4 border-coral bg-coral/15 px-4 py-3 text-sm font-bold">
          {{ errorMessage }}
        </p>
        <button class="focus-ring mt-5 w-full border-2 border-ink bg-ink px-5 py-4 text-lg font-black text-white disabled:opacity-40" :disabled="submitting">
          {{ submitting ? '驗證中…' : '查看圖片' }}
        </button>
      </form>

      <div v-else class="grid min-h-[360px] place-items-center p-8 text-center">
        <div>
          <h1 class="text-4xl font-black">
            找不到圖片
          </h1>
          <p class="mt-3 text-ink/60">
            這個圖片連結不存在或已過期。
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

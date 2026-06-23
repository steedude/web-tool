<script setup lang="ts">
import type { CreatedLink, LinkPreview } from '~/types/link.type'
import QRCode from 'qrcode'
import { LINK_EXPIRY_OPTIONS, LINK_QR_CONFIG, LinkExpiryDay } from '~/configs/link.config'
import { getHostname, getPreviewImage, normalizeAliasInput } from '~/utils/link.util'

const url = ref('')
const alias = ref('')
const password = ref('')
const expiresInDays = ref<LinkExpiryDay>(LinkExpiryDay.Forever)
const preview = ref<LinkPreview | null>(null)
const created = ref<CreatedLink | null>(null)
const qrCode = ref('')
const loadingPreview = ref(false)
const creating = ref(false)
const errorMessage = ref('')
const copied = ref(false)
const { t } = useI18n()
const previewHostname = computed(() => preview.value ? getHostname(preview.value.url) : '')
const createdHostname = computed(() => created.value ? getHostname(created.value.target_url) : '')

async function loadPreview() {
  if (!url.value.trim())
    return
  loadingPreview.value = true
  errorMessage.value = ''
  created.value = null
  try {
    preview.value = await $fetch<LinkPreview>('/api/links/preview', { query: { url: url.value } })
    url.value = preview.value.url
  }
  catch (error: any) {
    preview.value = null
    errorMessage.value = error.data?.statusMessage || '無法讀取這個網頁'
  }
  finally {
    loadingPreview.value = false
  }
}

async function createLink() {
  if (!preview.value)
    await loadPreview()
  if (!preview.value)
    return
  creating.value = true
  errorMessage.value = ''
  try {
    created.value = await $fetch<CreatedLink>('/api/links', {
      method: 'POST',
      body: {
        alias: alias.value || undefined,
        description: preview.value.description,
        expiresInDays: expiresInDays.value,
        favicon: preview.value.favicon,
        image: preview.value.image,
        password: password.value || undefined,
        screenshot: preview.value.screenshot,
        title: preview.value.title,
        url: preview.value.url,
      },
    })
    qrCode.value = await QRCode.toDataURL(created.value.shortUrl, LINK_QR_CONFIG)
  }
  catch (error: any) {
    errorMessage.value = error.data?.statusMessage || '短網址建立失敗，請稍後再試'
  }
  finally {
    creating.value = false
  }
}

async function copyShortUrl() {
  if (!created.value)
    return
  await navigator.clipboard.writeText(created.value.shortUrl)
  copied.value = true
  setTimeout(() => copied.value = false, 1500)
}
</script>

<template>
  <main class="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:py-16">
    <NuxtLink to="/" class="focus-ring inline-flex font-bold hover:underline">
      ← 回到實驗室
    </NuxtLink>
    <div class="mt-10 grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
      <section>
        <p class="text-sm font-black tracking-[.24em]">
          {{ t('links.eyebrow') }}
        </p>
        <h1 class="mt-5 text-5xl leading-[.95] font-black tracking-[-.055em] sm:text-7xl">
          一條網址，變得更好分享。
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-8">
          讀取網頁標題與分享圖片、產生縮圖，再建立自己的短網址與 QR Code。
        </p>

        <form class="mt-9 border-2 border-ink bg-white p-5 shadow-[8px_8px_0_#ad9cff] sm:p-7" @submit.prevent="createLink">
          <label class="text-sm font-black" for="target-url">目標網址</label>
          <div class="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="target-url" v-model="url" required type="text" placeholder="example.com/article" class="focus-ring min-w-0 flex-1 border-2 border-ink bg-paper px-4 py-4">
            <button type="button" class="focus-ring border-2 border-ink bg-sky px-5 py-3 font-black disabled:opacity-40" :disabled="loadingPreview || !url" @click="loadPreview">
              {{ loadingPreview ? '讀取中…' : '取得預覽' }}
            </button>
          </div>
          <div class="mt-5 grid gap-4 sm:grid-cols-2">
            <label class="text-sm font-black">自訂代碼（選填）
              <span class="mt-2 flex border-2 border-ink bg-paper"><span class="border-r-2 border-ink px-3 py-3 text-ink/50">/s/</span><input v-model="alias" maxlength="24" pattern="[a-zA-Z0-9_-]{3,24}" placeholder="my-link" class="min-w-0 flex-1 bg-transparent px-3 outline-none" @input="alias = normalizeAliasInput(alias)"></span>
            </label>
            <label class="text-sm font-black">有效期限
              <select v-model="expiresInDays" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-3 py-3">
                <option v-for="option in LINK_EXPIRY_OPTIONS" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </label>
          </div>
          <label class="mt-5 block text-sm font-black">密碼保護（選填）
            <input v-model="password" type="password" maxlength="128" autocomplete="new-password" placeholder="留空代表任何人都能開啟" class="focus-ring mt-2 w-full border-2 border-ink bg-paper px-4 py-4">
          </label>
          <p v-if="errorMessage" class="mt-4 border-l-4 border-coral bg-coral/15 px-4 py-3 text-sm font-bold">
            {{ errorMessage }}
          </p>
          <button class="focus-ring mt-6 w-full border-2 border-ink bg-ink px-5 py-4 text-lg font-black text-white disabled:opacity-40" :disabled="creating || !url">
            {{ creating ? '正在建立…' : '建立短網址' }}
          </button>
        </form>
      </section>

      <section class="lg:pt-12">
        <div v-if="created" class="border-2 border-ink bg-acid p-5 shadow-[8px_8px_0_#171714] sm:p-7">
          <p class="text-xs font-black tracking-[.2em]">
            YOUR SHORT LINK
          </p>
          <a :href="created.shortUrl" target="_blank" class="focus-ring mt-3 block break-all text-3xl font-black underline sm:text-4xl">{{ created.shortUrl }}</a>
          <div class="mt-5 overflow-hidden border-2 border-ink bg-white">
            <div class="aspect-[1200/630] overflow-hidden border-b-2 border-ink bg-violet/20">
              <img :src="getPreviewImage(created.image_url, created.screenshot_url)" :alt="created.title || created.target_url" class="h-full w-full object-cover">
            </div>
            <div class="p-4">
              <div class="flex items-center gap-2 text-xs font-bold text-ink/55">
                <img v-if="created.favicon_url" :src="created.favicon_url" alt="" class="size-5" @error="($event.target as HTMLImageElement).style.display = 'none'">
                <span>{{ createdHostname }}</span>
              </div>
              <h2 class="mt-2 text-xl font-black">
                {{ created.title || created.target_url }}
              </h2>
              <p v-if="created.description" class="mt-2 text-sm leading-6 text-ink/70">
                {{ created.description }}
              </p>
            </div>
          </div>
          <div class="mt-6 grid items-center gap-5 sm:grid-cols-[170px_1fr]">
            <img :src="qrCode" alt="短網址 QR Code" class="w-full border-2 border-ink bg-white p-2">
            <div>
              <p class="break-all text-sm">
                前往：{{ created.target_url }}
              </p>
              <p v-if="created.password_required" class="mt-2 inline-flex border border-ink bg-white px-2 py-1 text-xs font-black">
                已啟用密碼保護
              </p>
              <button class="focus-ring mt-4 border-2 border-ink bg-white px-5 py-3 font-black" @click="copyShortUrl">
                {{ copied ? '已複製！' : '複製短網址' }}
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="preview" class="overflow-hidden border-2 border-ink bg-white shadow-[8px_8px_0_#171714]">
          <div class="aspect-[1200/630] overflow-hidden border-b-2 border-ink bg-violet/20">
            <img :src="getPreviewImage(preview.image, preview.screenshot)" :alt="preview.title" class="h-full w-full object-cover" @error="($event.target as HTMLImageElement).src = preview!.screenshot">
          </div>
          <div class="p-5 sm:p-7">
            <div class="flex items-center gap-2 text-xs font-bold text-ink/55">
              <img :src="preview.favicon" alt="" class="size-5" @error="($event.target as HTMLImageElement).style.display = 'none'"><span>{{ previewHostname }}</span>
            </div>
            <h2 class="mt-3 text-3xl font-black tracking-tight">
              {{ preview.title }}
            </h2>
            <p class="mt-3 leading-7 text-ink/70">
              {{ preview.description || '這個頁面沒有提供描述。' }}
            </p>
          </div>
        </div>

        <div v-else class="grid min-h-[470px] place-items-center border-2 border-dashed border-ink/40 bg-white/45 p-8 text-center">
          <div>
            <div class="text-6xl">
              ▧
            </div><h2 class="mt-5 text-2xl font-black">
              網頁預覽會出現在這裡
            </h2><p class="mt-2 text-ink/60">
              包含標題、描述、分享圖片或即時縮圖
            </p>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

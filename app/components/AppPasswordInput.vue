<script setup lang="ts">
import { LINK_FORM_LIMITS } from '~/configs/link.config'

withDefaults(defineProps<{
  autocomplete?: 'new-password' | 'current-password'
  placeholder?: string
  required?: boolean
}>(), { autocomplete: 'new-password', required: false })
const password = defineModel<string>({ required: true })
const visible = ref(false)
const { t } = useI18n()
</script>

<template>
  <span class="mt-2 flex rounded-control border-2 border-ink bg-paper">
    <input v-model="password" :type="visible ? 'text' : 'password'" :maxlength="LINK_FORM_LIMITS.password" :autocomplete="autocomplete" :placeholder="placeholder" :required="required" class="focus-ring min-w-0 flex-1 rounded-l-control bg-transparent px-4 py-3">
    <button type="button" class="focus-ring rounded-r-control border-l-2 border-ink px-3 text-xs font-black" :aria-pressed="visible" :aria-label="visible ? t('common.hidePassword') : t('common.showPassword')" @click="visible = !visible">
      {{ visible ? t('common.hidePassword') : t('common.showPassword') }}
    </button>
  </span>
</template>

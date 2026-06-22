<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <PlaceholderPage
    accent="bg-sky"
    :description="t('placeholder.dropDescription')"
    index="02"
    :title="t('placeholder.dropTitle')"
  />
</template>

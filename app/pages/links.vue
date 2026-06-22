<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <PlaceholderPage
    accent="bg-violet"
    :description="t('placeholder.linksDescription')"
    index="03"
    :title="t('placeholder.linksTitle')"
  />
</template>

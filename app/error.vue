<script setup lang="ts">
import type { NuxtError } from '#app'
const props = defineProps<{ error: NuxtError }>()
const { locale, t } = useLocale()
const missing = computed(() => props.error.statusCode === 404)
</script>
<template>
  <PortalRoot>
    <PortalShell :locale="locale" :signed-in="false" current-path="" @locale="locale = $event">
      <PortalHeading tag="h1">{{ t(missing ? 'notFoundTitle' : 'errorTitle') }}</PortalHeading>
      <PortalText>{{ t(missing ? 'notFoundText' : 'genericError') }}</PortalText>
      <PortalButton @click="clearError({ redirect: '/' })">{{ t('returnHome') }}</PortalButton>
    </PortalShell>
  </PortalRoot>
</template>

<script setup lang="ts">
import type { ThemeNoticeProps } from '../../../shared/types/theme'
withDefaults(defineProps<ThemeNoticeProps>(), { variant: 'info' })
</script>

<template>
  <UAlert
    :color="variant === 'error' ? 'error' : variant === 'success' ? 'success' : 'info'"
    variant="subtle"
    :title="title"
    :role="variant === 'error' ? 'alert' : 'status'"
    class="portal-notice"
  >
    <template #description><slot /></template>
  </UAlert>
</template>

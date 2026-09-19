<script setup lang="ts">
import type { ThemeButtonProps } from '../../../shared/types/theme'
const props = withDefaults(defineProps<ThemeButtonProps>(), { type: 'button', variant: 'primary' })
const color = computed(() =>
  props.variant === 'danger' ? 'error' : props.variant === 'secondary' ? 'neutral' : 'primary'
)
const appearance = computed(() =>
  props.variant === 'link' ? 'link' : props.variant === 'secondary' ? 'outline' : 'solid'
)
</script>

<template>
  <UButton
    :type="type"
    :color="color"
    :variant="appearance"
    :disabled="disabled || loading"
    :loading="loading"
    size="xl"
    class="portal-button"
    ><slot
  /></UButton>
</template>

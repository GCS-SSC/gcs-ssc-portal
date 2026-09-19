<script setup lang="ts">
import type { ThemeBadgeProps } from '../../../shared/types/theme'
withDefaults(defineProps<ThemeBadgeProps>(), { tone: 'neutral' })
</script>

<template>
  <UBadge
    :color="tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : 'neutral'"
    variant="subtle"
    size="md"
    class="portal-badge"
    ><slot
  /></UBadge>
</template>

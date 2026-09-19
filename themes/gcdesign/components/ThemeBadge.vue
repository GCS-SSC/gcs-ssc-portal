<script setup lang="ts">
import type { ThemeBadgeProps } from '../../../shared/types/theme'
defineProps<ThemeBadgeProps>()
</script>

<template>
  <span class="gc-status" :class="`gc-status--${tone ?? 'neutral'}`"><slot /></span>
</template>

<script setup lang="ts">
import type { PortalBadgeProps } from '../../../shared/types/ui'
defineProps<PortalBadgeProps>()
</script>

<template>
  <span class="gc-status" :class="`gc-status--${tone ?? 'neutral'}`"><slot /></span>
</template>

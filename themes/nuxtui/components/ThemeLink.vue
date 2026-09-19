<script setup lang="ts">
import type { ThemeLinkProps } from '../../../shared/types/theme'
defineProps<ThemeLinkProps>()
</script>

<template>
  <ULink :to="to" :external="external" class="portal-link"><slot /></ULink>
</template>

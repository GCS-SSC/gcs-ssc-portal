<script setup lang="ts">
import { GcdsLink } from '@gcds-core/components-vue'
import type { ThemeLinkProps } from '../../../shared/types/theme'

defineProps<ThemeLinkProps>()
</script>

<template>
  <GcdsLink :href="to" :external="external"><slot /></GcdsLink>
</template>

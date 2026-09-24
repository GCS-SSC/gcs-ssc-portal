<script setup lang="ts">
import { GcdsLink } from '@gcds-core/components-vue'
import type { PortalLinkProps } from '../../../shared/types/ui'

defineProps<PortalLinkProps>()
</script>

<template>
  <GcdsLink :href="to" :external="external"><slot /></GcdsLink>
</template>

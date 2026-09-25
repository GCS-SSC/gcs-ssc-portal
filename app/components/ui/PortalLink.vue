<script setup lang="ts">
import { GcdsLink, GcdsButton } from '@gcds-core/components-vue'
import type { PortalLinkProps } from '../../../shared/types/ui'

defineProps<PortalLinkProps>()
</script>

<template>
  <GcdsButton
    v-if="variant === 'button'"
    :size="size ?? 'regular'"
    :button-role="buttonRole ?? 'primary'"
    type="link"
    :href="to"
    ><slot
  /></GcdsButton>
  <GcdsLink v-else :href="to" :external="external"><slot /></GcdsLink>
</template>

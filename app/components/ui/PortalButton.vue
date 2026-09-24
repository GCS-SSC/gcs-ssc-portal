<script setup lang="ts">
import { GcdsButton } from '@gcds-core/components-vue'
import type { PortalButtonProps } from '../../../shared/types/ui'

const props = defineProps<PortalButtonProps>()
const emit = defineEmits<{ click: [event: Event] }>()
const handleClick = (event: Event) => {
  if (!props.disabled && !props.loading) emit('click', event)
}
</script>

<template>
  <!-- GCDS bridges submit/reset to the containing native form itself. -->
  <GcdsButton
    :class="{ 'gc-button-link': variant === 'link' }"
    :type="type ?? 'button'"
    :button-role="variant === 'link' ? 'secondary' : (variant ?? 'primary')"
    :disabled="disabled || loading"
    :aria-busy="loading ? 'true' : undefined"
    @gcds-click="handleClick"
    ><slot
  /></GcdsButton>
</template>

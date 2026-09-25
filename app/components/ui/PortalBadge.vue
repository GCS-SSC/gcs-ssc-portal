<script setup lang="ts">
import type { PortalBadgeProps } from '../../../shared/types/ui'
const props = defineProps<PortalBadgeProps>()
const customStyle = computed(() => {
  if (!props.colour || !/^#[0-9a-fA-F]{6}$/.test(props.colour)) return undefined
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(props.colour!.slice(offset, offset + 2), 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  const luminance = channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
  return { backgroundColor: props.colour, color: luminance > 0.179 ? '#000000' : '#ffffff' }
})
</script>

<template>
  <span class="gc-status" :class="`gc-status--${tone ?? 'neutral'}`" :style="customStyle"
    ><slot
  /></span>
</template>

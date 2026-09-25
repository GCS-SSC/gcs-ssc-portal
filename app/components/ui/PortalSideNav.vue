<script setup lang="ts">
import { GcdsSideNav, GcdsNavLink } from '@gcds-core/components-vue'
defineProps<{ label: string; items: { to: string; label: string; current: boolean }[] }>()
const follow = (event: MouseEvent, to: string) => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
  event.preventDefault()
  return navigateTo(to)
}
</script>
<template>
  <GcdsSideNav :label="label">
    <GcdsNavLink
      v-for="item in items"
      :key="item.to"
      :href="item.to"
      :current="item.current"
      @click="follow($event, item.to)"
    >
      {{ item.label }}
    </GcdsNavLink>
  </GcdsSideNav>
</template>

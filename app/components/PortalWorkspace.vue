<script setup lang="ts">
const props = defineProps<{
  title: string
  navigationLabel: string
  items: { to: string; label: string; current: boolean }[]
}>()
const content = ref<HTMLElement | null>(null)
const currentItem = computed(() => props.items.find((item) => item.current))
watch(
  () => currentItem.value?.to,
  async () => {
    await nextTick()
    content.value?.focus()
  }
)
</script>

<template>
  <div class="entity-heading">
    <PortalHeading tag="h1">{{ title }}</PortalHeading>
    <div v-if="$slots.statuses" class="badges"><slot name="statuses" /></div>
  </div>
  <PortalGrid
    class="workspace"
    columns="minmax(0, 1fr)"
    columns-tablet="minmax(0, 1fr) minmax(0, 2.4fr)"
    columns-desktop="minmax(0, 1fr) minmax(0, 3fr)"
    gap="400"
  >
    <div>
      <PortalText class="workspace-mobile-label">{{ navigationLabel }}</PortalText>
      <PortalSideNav :label="navigationLabel" :items="items" />
    </div>
    <div
      ref="content"
      class="workspace-body"
      tabindex="-1"
      role="region"
      :aria-label="currentItem?.label"
    >
      <slot />
    </div>
  </PortalGrid>
</template>

<script setup lang="ts">
defineProps<{
  as: 'li' | 'section'
  headingTag: 'h2' | 'h3' | 'h4'
}>()
</script>

<template>
  <component :is="as" class="record-summary">
    <div class="record-summary-content">
      <PortalHeading :tag="headingTag" class="record-summary-heading" margin-top="0">
        <slot name="title" />
      </PortalHeading>
      <slot name="details" />
      <div v-if="$slots.actions" class="form-actions record-summary-actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-if="$slots.cta" class="record-summary-cta">
      <slot name="cta" />
    </div>
  </component>
</template>

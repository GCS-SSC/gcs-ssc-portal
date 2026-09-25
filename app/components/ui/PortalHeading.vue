<script setup lang="ts">
import { GcdsHeading } from '@gcds-core/components-vue'
defineProps<{ tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' }>()
</script>
<template>
  <GcdsHeading :tag="tag"><slot /></GcdsHeading>
</template>

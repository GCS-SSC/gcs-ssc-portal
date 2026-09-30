<script setup lang="ts">
import { GcdsDetails } from '@gcds-core/components-vue'
defineProps<{ title: string; open?: boolean }>()
</script>
<template>
  <GcdsDetails :details-title="title" :open="open"><slot /></GcdsDetails>
</template>

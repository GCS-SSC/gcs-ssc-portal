<script setup lang="ts">
import { GcdsDetails } from '@gcds-core/components-vue'
defineProps<{ title: string }>()
</script>
<template>
  <GcdsDetails :details-title="title"><slot /></GcdsDetails>
</template>

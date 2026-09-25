<script setup lang="ts">
import { GcdsFieldset } from '@gcds-core/components-vue'
defineProps<{ legend: string }>()
</script>
<template>
  <GcdsFieldset :legend="legend" legend-size="h3"><slot /></GcdsFieldset>
</template>

<script setup lang="ts">
import { GcdsFieldset } from '@gcds-core/components-vue'
defineProps<{ legend: string; legendSize?: 'h2' | 'h3' | 'h4' | 'h5' | 'h6'; hint?: string }>()
</script>
<template>
  <GcdsFieldset :legend="legend" :legend-size="legendSize ?? 'h3'" :hint="hint"><slot /></GcdsFieldset>
</template>

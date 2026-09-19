<script setup lang="ts">
import type { ThemeFileProps } from '../../../shared/types/theme'
defineProps<ThemeFileProps>()
const emit = defineEmits<{ change: [file: File | null] }>()
const change = (event: Event) =>
  emit('change', (event.target as HTMLInputElement).files?.[0] ?? null)
</script>
<template>
  <div class="portal-field">
    <label :for="id" class="portal-field-label">{{ label }}</label>
    <p v-if="hint" :id="`${id}-hint`" class="portal-field-hint">{{ hint }}</p>
    <UInput
      :id="id"
      type="file"
      :disabled="disabled"
      :aria-describedby="hint ? `${id}-hint` : undefined"
      size="xl"
      class="portal-input"
      @change="change"
    />
  </div>
</template>

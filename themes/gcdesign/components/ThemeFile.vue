<script setup lang="ts">
import { GcdsFileUploader } from '@gcds-core/components-vue'
import type { Ref } from 'vue'
import type { ThemeFileProps } from '../../../shared/types/theme'
defineProps<ThemeFileProps>()
const locale = inject<Ref<'en' | 'fr'>>('portal-theme-locale', ref('en'))
const emit = defineEmits<{ change: [file: File | null] }>()
const change = (event: Event) =>
  emit('change', (event.currentTarget as HTMLElement & { files: FileList }).files?.[0] ?? null)
</script>
<template>
  <GcdsFileUploader
    :uploader-id="id"
    :name="id"
    :label="label"
    :hint="hint"
    :disabled="disabled"
    :lang="locale"
    @gcds-change="change"
  />
</template>

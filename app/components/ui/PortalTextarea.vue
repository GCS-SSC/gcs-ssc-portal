<script setup lang="ts">
import type { Ref } from 'vue'
import { GcdsTextarea } from '@gcds-core/components-vue'
import type { PortalTextareaProps } from '../../../shared/types/ui'

defineProps<PortalTextareaProps>()
const locale = inject<Ref<'en' | 'fr'>>('portal-locale', ref('en'))
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const updateValue = (event: Event) => {
  emit('update:modelValue', String((event as CustomEvent<string>).detail ?? ''))
}
</script>

<template>
  <GcdsTextarea
    :key="disabled ? 'disabled' : 'enabled'"
    :lang="locale"
    :required="required && !disabled"
    :disabled="disabled"
    :error-message="error"
    :textarea-id="id"
    :name="id"
    :value="modelValue"
    :label="label"
    :hint="hint"
    :maxlength="maxlength"
    :rows="rows ?? 3"
    validate-on="submit"
    @gcds-input="updateValue"
    @gcds-change="updateValue"
  />
</template>

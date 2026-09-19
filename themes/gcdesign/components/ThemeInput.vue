<script setup lang="ts">
import type { Ref } from 'vue'
import { GcdsInput } from '@gcds-core/components-vue'
import type { ThemeInputProps } from '../../../shared/types/theme'

defineProps<ThemeInputProps>()
const locale = inject<Ref<'en' | 'fr'>>('portal-theme-locale', ref('en'))
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const updateValue = (event: Event) => {
  const value = (event as CustomEvent<string>).detail
  emit('update:modelValue', String(value ?? ''))
}
</script>

<template>
  <GcdsInput
    :lang="locale"
    :input-id="id"
    :name="id"
    :value="modelValue"
    :label="label"
    :type="type ?? 'text'"
    :required="required"
    :disabled="disabled"
    :readonly="readonly"
    :autocomplete="autocomplete"
    :hint="hint"
    :error-message="error"
    :maxlength="maxlength"
    :minlength="minlength"
    validate-on="submit"
    @gcds-input="updateValue"
    @gcds-change="updateValue"
  />
</template>

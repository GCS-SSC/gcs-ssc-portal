<script setup lang="ts">
import type { Ref } from 'vue'
import { GcdsInput } from '@gcds-core/components-vue'
import type { PortalInputProps } from '../../../shared/types/ui'

defineProps<PortalInputProps>()
const locale = inject<Ref<'en' | 'fr'>>('portal-locale', ref('en'))
const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: []
  blur: []
}>()
const updateValue = (event: Event) => {
  const value = (event as CustomEvent<string>).detail
  emit('update:modelValue', String(value ?? ''))
}
</script>

<template>
  <!-- Recreate on disabled transitions: GCDS watches disabled before required and otherwise re-enables the control. -->
  <GcdsInput
    :key="disabled ? 'disabled' : 'enabled'"
    :lang="locale"
    :input-id="id"
    :name="id"
    :value="modelValue"
    :label="label"
    :type="type ?? 'text'"
    :required="required && !disabled"
    :disabled="disabled"
    :readonly="readonly"
    :autocomplete="autocomplete"
    :hint="hint"
    :error-message="error"
    :maxlength="maxlength"
    :inputmode="inputmode"
    :minlength="minlength"
    validate-on="submit"
    @gcds-input="updateValue"
    @gcds-change="updateValue"
    @gcds-focus="emit('focus')"
    @gcds-blur="emit('blur')"
  />
</template>

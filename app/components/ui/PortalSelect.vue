<script setup lang="ts">
import type { Ref } from 'vue'
import { GcdsSelect } from '@gcds-core/components-vue'
import type { PortalSelectProps } from '../../../shared/types/ui'

defineProps<PortalSelectProps>()
const locale = inject<Ref<'en' | 'fr'>>('portal-locale', ref('en'))
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const updateValue = (event: Event) => {
  emit('update:modelValue', String((event as CustomEvent<string>).detail ?? ''))
}
</script>

<template>
  <!-- Recreate on disabled transitions: GCDS watches disabled before required and otherwise re-enables the control. -->
  <GcdsSelect
    :key="disabled ? 'disabled' : 'enabled'"
    :lang="locale"
    :select-id="id"
    :name="id"
    :value="modelValue"
    :label="label"
    :required="required && !disabled"
    :disabled="disabled"
    :hint="hint"
    :error-message="error"
    validate-on="submit"
    @gcds-change="updateValue"
  >
    <option v-for="option in options" :key="option.value" :value="option.value">
      {{ option.label }}
    </option>
  </GcdsSelect>
</template>

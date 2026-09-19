<script setup lang="ts">
import type { Ref } from 'vue'
import { GcdsSelect } from '@gcds-core/components-vue'
import type { ThemeSelectProps } from '../../../shared/types/theme'

defineProps<ThemeSelectProps>()
const locale = inject<Ref<'en' | 'fr'>>('portal-theme-locale', ref('en'))
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const updateValue = (event: Event) => {
  emit('update:modelValue', String((event as CustomEvent<string>).detail ?? ''))
}
</script>

<template>
  <GcdsSelect
    :lang="locale"
    :select-id="id"
    :name="id"
    :value="modelValue"
    :label="label"
    :required="required"
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

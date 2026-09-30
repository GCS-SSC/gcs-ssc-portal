<script setup lang="ts">
import { GcdsCheckboxes } from '@gcds-core/components-vue'
import type { Ref } from 'vue'
const props = defineProps<{ id: string; label: string; hint?: string; required?: boolean; disabled?: boolean; error?: string;
  modelValue: string[]; options: { value: string; label: string }[] }>()
const locale = inject<Ref<'en' | 'fr'>>('portal-locale', ref('en'))
const emit = defineEmits<{ toggle: [value: string, selected: boolean] }>()
const change = (event: Event) => {
  const values = (event as CustomEvent<string[]>).detail
  for (const option of props.options) {
    const selected = values.includes(option.value)
    if (selected !== props.modelValue.includes(option.value)) emit('toggle', option.value, selected)
  }
}
</script>
<template>
  <!-- The provider validates at least one selection. GCDS required would require every native checkbox. -->
  <PortalFieldset :legend="`${label}${required ? locale === 'fr' ? ' (obligatoire)' : ' (required)' : ''}`" legend-size="h6">
    <GcdsCheckboxes
      v-if="options.length" :key="disabled ? 'disabled' : 'enabled'" :lang="locale" :name="id" :legend="label"
      :value="modelValue" :options="options.map(option => ({ ...option, id: `${id}-${option.value}`, checked: modelValue.includes(option.value) }))"
      :hint="hint" :required="false" :disabled="disabled" :hide-legend="true" :error-message="error" validate-on="submit" @gcds-change="change" />
  </PortalFieldset>
</template>

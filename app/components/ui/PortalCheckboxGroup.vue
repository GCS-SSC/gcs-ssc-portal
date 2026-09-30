<script setup lang="ts">
import { GcdsCheckboxes } from '@gcds-core/components-vue'
import type { Ref } from 'vue'
const props = defineProps<{ id: string; label: string; hint?: string; required?: boolean; disabled?: boolean; error?: string;
  modelValue: string[]; options: { value: string; label: string }[] }>()
const locale = inject<Ref<'en' | 'fr'>>('portal-locale', ref('en'))
// Keep option identity stable when only answers/errors change. GCDS rebuilds
// native refs on option updates; selected values belong to its value prop.
const nativeOptions = computed<{ value: string; label: string; id: string }[]>((previous) => {
  const next = props.options.map(option => ({ ...option, id: `${props.id}-${option.value}` }))
  return previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next
})
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
      :value="modelValue" :options="nativeOptions"
      :hint="hint" :required="false" :disabled="disabled" :hide-legend="true" :error-message="error" validate-on="other" @gcds-change="change" />
  </PortalFieldset>
</template>

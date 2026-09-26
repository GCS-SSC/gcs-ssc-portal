<script setup lang="ts">
import type { Ref } from 'vue'
import { GcdsSearch } from '@gcds-core/components-vue'

const props = defineProps<{ id: string; modelValue: string; label: string }>()
const locale = inject<Ref<'en' | 'fr'>>('portal-locale', ref('en'))
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

// GCDS builds the accessible name as “Search {placeholder}” or
// “Rechercher dans {placeholder}”. Keep the caller's localized label intact.
const placeholder = computed(() => {
  if (locale.value === 'en') return props.label.replace(/^Search\s+/i, '')
  return props.label.replace(/^Rechercher(?: dans)?\s+/i, '').replace(/^des\s+/i, 'les ')
})
const updateValue = (event: Event) => {
  emit('update:modelValue', String((event as CustomEvent<string>).detail ?? ''))
}
</script>

<template>
  <GcdsSearch
    :lang="locale"
    :search-id="id"
    :name="id"
    :value="modelValue"
    :placeholder="placeholder"
    action="#"
    @gcds-input="updateValue"
    @gcds-change="updateValue"
    @gcds-submit.prevent
  />
</template>

<script setup lang="ts">
import type { ThemeSelectProps } from '../../../shared/types/theme'
import type { Ref } from 'vue'
const props = defineProps<ThemeSelectProps>()
// Reka reserves an empty string for the unselected state; never render it as an item.
const placeholder = computed(() => props.options.find((option) => option.value === '')?.label)
const items = computed(() => props.options.filter((option) => option.value !== ''))
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const locale = inject<Ref<'en' | 'fr'>>('portal-theme-locale', ref('en'))
const describedBy = computed(
  () =>
    [props.hint ? `${props.id}-hint` : '', props.error ? `${props.id}-error` : '']
      .filter(Boolean)
      .join(' ') || undefined
)
</script>

<template>
  <div class="portal-field">
    <label :for="id" class="portal-field-label"
      >{{ label }}
      <span v-if="required" class="portal-required"
        >({{ locale === 'fr' ? 'obligatoire' : 'required' }})</span
      ></label
    >
    <p v-if="hint" :id="`${id}-hint`" class="portal-field-hint">{{ hint }}</p>
    <USelect
      :id="id"
      :name="id"
      :model-value="modelValue"
      :items="items"
      :placeholder="placeholder"
      value-key="value"
      label-key="label"
      :required="required"
      :disabled="disabled"
      :aria-required="required"
      :aria-describedby="describedBy"
      :aria-invalid="error ? true : undefined"
      :color="error ? 'error' : 'neutral'"
      size="xl"
      class="portal-select"
      @update:model-value="emit('update:modelValue', String($event ?? ''))"
    />
    <p v-if="error" :id="`${id}-error`" class="portal-field-error">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import type { ThemeInputProps } from '../../../shared/types/theme'
import type { Ref } from 'vue'
const props = withDefaults(defineProps<ThemeInputProps>(), { type: 'text' })
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
    <UInput
      :id="id"
      :name="id"
      :model-value="modelValue"
      :type="type"
      :required="required"
      :disabled="disabled"
      :readonly="readonly"
      :autocomplete="autocomplete"
      :maxlength="maxlength"
      :minlength="minlength"
      :aria-describedby="describedBy"
      :aria-invalid="error ? true : undefined"
      :color="error ? 'error' : 'neutral'"
      size="xl"
      class="portal-input"
      @update:model-value="emit('update:modelValue', String($event ?? ''))"
    />
    <p v-if="error" :id="`${id}-error`" class="portal-field-error">{{ error }}</p>
  </div>
</template>

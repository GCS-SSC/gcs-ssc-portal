<script setup lang="ts">
import type { SurveyField } from '@gcs-ssc/survey/vue'
defineProps<{ fields: SurveyField[]; ids: string[]; prefix: string }>()
const { s, surveyError } = useSurveyLocale()
const change = (field: SurveyField, value: string) => field.setValue(value)
</script>
<template>
  <template v-for="id in ids" :key="id">
    <template v-for="field in fields.filter((item) => item.id === id)" :key="field.id">
      <PortalSelect
        v-if="field.question.type === 'select'"
        :id="`${prefix}-${field.id}`"
        :model-value="field.value"
        :label="field.label"
        :hint="field.hint"
        :required="field.required"
        :disabled="field.disabled"
        :options="[{ value: '', label: s('choose') }, ...field.options]"
        :error="surveyError(field.error)"
        @update:model-value="change(field, $event)"
      />
      <PortalInput
        v-else
        :id="`${prefix}-${field.id}`"
        :model-value="field.value"
        :label="field.label"
        :type="field.question.type === 'email' ? 'email' : 'text'"
        :hint="
          [
            field.hint,
            field.question.type === 'date'
              ? s('dateHint')
              : field.question.type === 'number'
                ? s('numberHint')
                : ''
          ]
            .filter(Boolean)
            .join(' ')
        "
        :required="field.required"
        :disabled="field.disabled"
        :maxlength="field.question.type === 'text' ? field.question.maxLength : 5000"
        :error="surveyError(field.error)"
        @update:model-value="change(field, $event)"
      />
    </template>
  </template>
</template>

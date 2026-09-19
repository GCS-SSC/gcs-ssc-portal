<script setup lang="ts">
import { conditionOperators, type SurveyCondition, type SurveyQuestion } from '@gcs-ssc/survey'
const model = defineModel<SurveyCondition | undefined>({ default: undefined })
const props = defineProps<{
  sources: SurveyQuestion[]
  prefix: string
  requiredCondition?: boolean
}>()
const { s } = useSurveyLocale(),
  { locale } = useLocale()
const mode = computed({
  get: () => model.value?.match ?? 'always',
  set: (value: string) => {
    if (value === 'always') model.value = undefined
    else
      model.value = {
        match: value as 'all' | 'any',
        conditions: model.value?.conditions ?? [
          { questionId: props.sources[0]?.id ?? '', operator: 'answered' }
        ]
      }
  }
})
const setSource = (index: number, questionId: string) => {
  if (model.value) model.value.conditions[index] = { questionId, operator: 'answered' }
}
const setOperator = (index: number, operator: string) => {
  const current = model.value?.conditions[index]
  if (!current || !model.value) return
  model.value.conditions[index] =
    operator === 'answered' || operator === 'notAnswered'
      ? { questionId: current.questionId, operator }
      : { questionId: current.questionId, operator: operator as 'equals', value: '' }
}
const source = (id: string) => props.sources.find((question) => question.id === id)
const operators = (id: string) =>
  conditionOperators
    .filter(
      (operator) =>
        !(['greaterThan', 'lessThan'].includes(operator) && source(id)?.type !== 'number') &&
        !(operator === 'contains' && source(id)?.type !== 'text')
    )
    .map((value) => ({ value, label: s(value) }))
const options = (id: string) => {
  const question = source(id)
  return question?.type === 'select'
    ? question.options.map((option) => ({ value: option.value, label: option.label[locale.value] }))
    : []
}
const add = () =>
  model.value?.conditions.push({ questionId: props.sources[0]?.id ?? '', operator: 'answered' })
</script>
<template>
  <div class="portal-form">
    <ThemeSelect
      :id="`${prefix}-mode`"
      v-model="mode"
      :label="s('condition')"
      :options="[
        ...(!requiredCondition ? [{ value: 'always', label: s('always') }] : []),
        ...(sources.length || model
          ? [
              { value: 'all', label: s('allConditions') },
              { value: 'any', label: s('anyConditions') }
            ]
          : [])
      ]"
      required
    />
    <template v-if="model">
      <div v-for="(predicate, index) in model.conditions" :key="index">
        <ThemeSelect
          :id="`${prefix}-source-${index}`"
          :model-value="predicate.questionId"
          :label="`${s('sourceQuestion')} ${index + 1}`"
          :options="
            sources.map((question) => ({ value: question.id, label: question.label[locale] }))
          "
          required
          @update:model-value="setSource(index, $event)"
        />
        <ThemeSelect
          :id="`${prefix}-operator-${index}`"
          :model-value="predicate.operator"
          :label="`${s('comparison')} ${index + 1}`"
          :options="operators(predicate.questionId)"
          required
          @update:model-value="setOperator(index, $event)"
        />
        <template v-if="'value' in predicate">
          <ThemeSelect
            v-if="source(predicate.questionId)?.type === 'select'"
            :id="`${prefix}-value-${index}`"
            v-model="predicate.value"
            :label="`${s('comparisonValue')} ${index + 1}`"
            :options="[{ value: '', label: s('choose') }, ...options(predicate.questionId)]"
            required
          />
          <ThemeInput
            v-else
            :id="`${prefix}-value-${index}`"
            v-model="predicate.value"
            :label="`${s('comparisonValue')} ${index + 1}`"
            :maxlength="5000"
            required
          />
        </template>
        <ThemeButton
          variant="link"
          :disabled="model.conditions.length === 1"
          @click="model.conditions.splice(index, 1)"
          >{{ s('removeCondition') }} {{ index + 1 }}</ThemeButton
        >
      </div>
      <ThemeButton
        variant="secondary"
        :disabled="model.conditions.length >= 20 || !sources.length"
        @click="add"
        >{{ s('addCondition') }}</ThemeButton
      >
    </template>
  </div>
</template>

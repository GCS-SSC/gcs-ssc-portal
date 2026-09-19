<script setup lang="ts">
import { createLocalId } from '~/utils/local-id'
import { questionV2Schema, questionTypes, type SurveyQuestion } from '@gcs-ssc/survey'
import SurveyDescriptionEditor from './SurveyDescriptionEditor.vue'
import SurveyConditionEditor from './SurveyConditionEditor.vue'
const props = defineProps<{ question?: SurveyQuestion; sources: SurveyQuestion[] }>()
const emit = defineEmits<{ save: [question: SurveyQuestion]; cancel: [] }>()
const { s } = useSurveyLocale()
const id = props.question?.id ?? `q_${createLocalId()}`
const type = ref<SurveyQuestion['type']>(props.question?.type ?? 'text')
const labelEn = ref(props.question?.label.en ?? ''),
  labelFr = ref(props.question?.label.fr ?? '')
const hint = ref(props.question?.hint ? { ...props.question.hint } : undefined)
const visibleWhen = ref(
  props.question?.visibleWhen
    ? (JSON.parse(JSON.stringify(props.question.visibleWhen)) as NonNullable<
        SurveyQuestion['visibleWhen']
      >)
    : undefined
)
const required = ref(props.question?.required ? 'required' : 'optional')
const maxLength = ref(String(props.question?.type === 'text' ? props.question.maxLength : 500))
const choices = ref(
  props.question?.type === 'select'
    ? props.question.options.map((option) => ({ value: option.value, label: { ...option.label } }))
    : [
        { value: 'choice_1', label: { en: '', fr: '' } },
        { value: 'choice_2', label: { en: '', fr: '' } }
      ]
)
const error = ref('')
const addChoice = () =>
  choices.value.push({
    value: `c_${createLocalId()}`,
    label: { en: '', fr: '' }
  })
const save = () => {
  const result = questionV2Schema.safeParse({
    id,
    type: type.value,
    label: { en: labelEn.value, fr: labelFr.value },
    hint: hint.value,
    visibleWhen: visibleWhen.value,
    required: required.value === 'required',
    ...(type.value === 'text' ? { maxLength: Number(maxLength.value) } : {}),
    ...(type.value === 'select' ? { options: choices.value } : {})
  })
  if (!result.success) {
    error.value = s('invalidQuestion')
    return
  }
  emit('save', result.data)
}
</script>
<template>
  <section class="content-section">
    <h3>{{ question ? s('editQuestion') : s('addQuestion') }}</h3>
    <form class="portal-form" @submit.prevent="save">
      <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice>
      <ThemeSelect
        id="question-type"
        v-model="type"
        :label="s('type')"
        :options="questionTypes.map((value) => ({ value, label: s(value) }))"
        required
      />
      <ThemeInput
        id="question-en"
        v-model="labelEn"
        :label="s('labelEn')"
        :maxlength="200"
        required
      />
      <ThemeInput
        id="question-fr"
        v-model="labelFr"
        :label="s('labelFr')"
        :maxlength="200"
        required
      />
      <SurveyDescriptionEditor v-model="hint" prefix="question-hint" :max-length="500" help />
      <h4>{{ s('visibility') }}</h4>
      <SurveyConditionEditor
        v-model="visibleWhen"
        :sources="sources"
        prefix="question-visibility"
      />
      <ThemeSelect
        id="question-required"
        v-model="required"
        :label="s('requirement')"
        :options="[
          { value: 'optional', label: s('optional') },
          { value: 'required', label: s('required') }
        ]"
        required
      />
      <ThemeInput
        v-if="type === 'text'"
        id="question-length"
        v-model="maxLength"
        :label="s('maxLength')"
        hint="1–5000"
        required
      />
      <template v-if="type === 'select'">
        <h4>{{ s('choices') }}</h4>
        <div v-for="(choice, index) in choices" :key="choice.value">
          <ThemeInput
            :id="`choice-en-${choice.value}`"
            v-model="choice.label.en"
            :label="`${s('choiceEn')} ${index + 1}`"
            :maxlength="200"
            required
          />
          <ThemeInput
            :id="`choice-fr-${choice.value}`"
            v-model="choice.label.fr"
            :label="`${s('choiceFr')} ${index + 1}`"
            :maxlength="200"
            required
          />
          <ThemeButton
            variant="link"
            :disabled="choices.length <= 2"
            @click="choices.splice(index, 1)"
            >{{ s('remove') }} {{ index + 1 }}</ThemeButton
          >
        </div>
        <ThemeButton variant="secondary" :disabled="choices.length >= 30" @click="addChoice()">{{
          s('addChoice')
        }}</ThemeButton>
      </template>
      <div class="form-actions">
        <ThemeButton type="submit">{{ s('saveQuestion') }}</ThemeButton
        ><ThemeButton variant="secondary" @click="emit('cancel')">{{ s('cancel') }}</ThemeButton>
      </div>
    </form>
  </section>
</template>

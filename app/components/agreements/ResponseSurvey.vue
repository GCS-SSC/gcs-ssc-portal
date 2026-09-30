<script setup lang="ts">
import { HeadlessSurvey } from '@gcs-ssc/survey/vue'
import {
  baseQuestionId,
  computedValue,
  parseChoices,
  parseList,
  parseTable,
  resolveSurvey,
  type SurveyAnswers,
  type SurveyDefinition
} from '@gcs-ssc/survey'
import SurveyFields from '../survey/SurveyFields.vue'
import GrantElement from '../survey/GrantElement.vue'
import ReadonlyTable from '../survey/ReadonlyTable.vue'
import type { SurveyField } from '@gcs-ssc/survey/vue'
import SurveyGroups from '../survey/SurveyGroups.vue'
const props = defineProps<{
  definition: SurveyDefinition
  readonly?: boolean
  disabled?: boolean
}>()
const answers = defineModel<SurveyAnswers>({ required: true })
const readQuestions = computed(() => {
  const route = resolveSurvey(props.definition, answers.value)
  const questions = new Map(props.definition.questions.map((question) => [question.id, question]))
  const listLabels = new Map<string, string>()
  for (const [key, value] of Object.entries(answers.value)) {
    const source = questions.get(baseQuestionId(key))
    if (source?.type !== 'list' && source?.type !== 'repeat') continue
    parseList(value).forEach((item, index) => listLabels.set(item.id,
      source.type === 'repeat' ? String(index + 1) : item.value))
  }
  return route.questionIds.flatMap((id) => {
    const question = questions.get(baseQuestionId(id))
    if (!question) return []
    const path = id.split('@').slice(1)
    const context = path.map((key) => listLabels.get(key) ?? key).join(' / ')
    const raw =
      question.type === 'computed' && (props.definition.schemaVersion === 3 || props.definition.schemaVersion === 4)
        ? computedValue(
            question,
            path,
            answers.value,
            new Set(route.questionIds),
            new Map(props.definition.questions.map((item) => [item.id, item]))
          )
        : (answers.value[id] ?? '')
    const value =
      question.type === 'checkboxes' || question.type === 'multiselect'
        ? parseChoices(raw).map(value => question.options.find(option => option.value === value)?.label[locale.value] ?? value).join(', ')
        : question.type === 'select'
        ? (question.options.find((option) => option.value === raw)?.label[locale.value] ?? raw)
        : question.type === 'list'
          ? parseList(raw)
              .map((item) => item.value)
              .join(', ')
          : question.type === 'repeat'
            ? String(parseList(raw).length)
          : question.type === 'table'
            ? parseTable(raw)
                .map((row) =>
                  question.columns
                    .map(
                      (column) => `${column.label[locale.value]}: ${row.cells[column.id] ?? '—'}`
                    )
                    .join(' · ')
                )
                .join(' | ')
            : raw
    return [
      {
        id,
        question,
        label: `${question.label[locale.value]}${context ? ` — ${context}` : ''}`,
        hint: question.hint?.[locale.value],
        value
      }
    ]
  })
})
const { locale } = useLocale(),
  { s } = useSurveyLocale()
const prefix = useId()
const readonlyGrantField = (entry: (typeof readQuestions.value)[number]): SurveyField => ({
  question: entry.question, id: entry.id, label: entry.label, hint: entry.hint ?? '',
  required: false, disabled: true, value: entry.value, error: undefined, options: [], setValue: () => {}
})
const navigate = async (action: (() => boolean) | (() => void)) => {
  if (props.disabled) return
  const result = action()
  await nextTick()
  document.getElementById(`${prefix}-${result === false ? 'errors' : 'page'}`)?.focus()
}
</script>
<template>
  <section class="content-section">
    <template v-if="readonly">
      <PortalHeading tag="h2">{{ definition.title[locale] }}</PortalHeading>
      <PortalText v-if="'description' in definition && definition.description">{{
        definition.description[locale]
      }}</PortalText>
      <template v-for="question in readQuestions" :key="question.id">
        <GrantElement
v-if="question.question.type === 'budget' || question.question.type === 'activities'"
          :field="readonlyGrantField(question)" :prefix="prefix" readonly />
        <ReadonlyTable v-else-if="question.question.type === 'table'" :question="question.question" :value="answers[question.id] ?? ''" :label="question.label" />
        <dl v-else>
          <dt>{{ question.label }}</dt>
          <dd :style="question.question.type === 'textarea' ? { whiteSpace: 'pre-wrap' } : undefined">
            <PortalText v-if="question.hint" size="small" text-role="secondary">{{ question.hint }}</PortalText>
            {{ question.value || '—' }}
          </dd>
        </dl>
      </template>
    </template>
    <HeadlessSurvey
      v-else
      v-model="answers"
      :definition="definition"
      :locale="locale"
      :disabled="disabled"
    >
      <template
        #default="{
          fields,
          title,
          description,
          page,
          pageIndex,
          canBack,
          isLastPage,
          complete,
          errors,
          next,
          back
        }"
      >
        <PortalHeading tag="h2">{{ title }}</PortalHeading>
        <PortalText v-if="description">{{ description }}</PortalText>
        <form class="portal-form" novalidate @submit.prevent="navigate(next)">
          <div
            v-if="Object.keys(errors).length"
            :id="`${prefix}-errors`"
            data-survey-errors
            tabindex="-1"
          >
            <PortalNotice variant="error">{{ s('validation') }}</PortalNotice>
          </div>
          <div :id="`${prefix}-page`" class="survey-page" tabindex="-1">
            <template v-if="complete">
              <PortalNotice variant="success">{{ s('valid') }}</PortalNotice>
            </template>
            <template v-else-if="page">
              <PortalHeading v-if="definition.schemaVersion !== 1" tag="h3">
                {{ s('page') }} {{ pageIndex + 1 }}: {{ page.title[locale] }}
              </PortalHeading>
              <PortalText v-if="page.description">{{ page.description[locale] }}</PortalText>
              <SurveyFields
                :fields="fields"
                :ids="page.questionIds"
                :prefix="prefix"
                :legend-size="definition.schemaVersion === 1 ? 'h3' : 'h4'"
              />
              <SurveyGroups
                v-if="'groups' in page"
                :groups="page.groups"
                :fields="fields"
                :prefix="prefix"
                root-heading="h4"
              />
              <section
                v-for="section in page.sections"
                :key="section.id"
                :aria-label="section.title[locale]"
                class="content-section"
              >
                <PortalHeading :id="`${prefix}-${section.id}`" tag="h4">{{
                  section.title[locale]
                }}</PortalHeading>
                <PortalText v-if="section.description">{{
                  section.description[locale]
                }}</PortalText>
                <SurveyFields :fields="fields" :ids="section.questionIds" :prefix="prefix" />
                <section
                  v-for="subsection in section.subsections"
                  :key="subsection.id"
                  :aria-label="subsection.title[locale]"
                  class="content-section"
                >
                  <PortalHeading :id="`${prefix}-${subsection.id}`" tag="h5">{{
                    subsection.title[locale]
                  }}</PortalHeading>
                  <PortalText v-if="subsection.description">{{
                    subsection.description[locale]
                  }}</PortalText>
                  <SurveyFields :fields="fields" :ids="subsection.questionIds" :prefix="prefix" />
                </section>
              </section>
            </template>
          </div>
          <div class="form-actions">
            <PortalButton
              v-if="canBack"
              variant="secondary"
              :disabled="disabled"
              @click="navigate(back)"
              >{{ s('previousPage') }}</PortalButton
            >
            <PortalButton v-if="!complete" type="submit" :disabled="disabled">{{
              s(isLastPage ? 'check' : 'nextPage')
            }}</PortalButton>
          </div>
        </form>
      </template>
    </HeadlessSurvey>
  </section>
</template>

<style scoped>
.survey-page .content-section {
  border-top: 0;
  padding-top: 0;
  margin-top: var(--gcds-spacing-300);
}
</style>

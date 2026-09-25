<script setup lang="ts">
import { HeadlessSurvey } from '@gcs-ssc/survey/vue'
import { resolveSurvey, type SurveyAnswers, type SurveyDefinition } from '@gcs-ssc/survey'
import SurveyFields from '../survey/SurveyFields.vue'
const props = defineProps<{ definition: SurveyDefinition; readonly?: boolean }>()
const answers = defineModel<SurveyAnswers>({ required: true })
const readQuestions = computed(() =>
  props.definition.questions.filter((question) =>
    resolveSurvey(props.definition, answers.value).questionIds.includes(question.id)
  )
)
const { locale } = useLocale(),
  { s } = useSurveyLocale()
const prefix = useId()
const navigate = async (action: (() => boolean) | (() => void)) => {
  const result = action()
  await nextTick()
  document.getElementById(`${prefix}-${result === false ? 'errors' : 'page'}`)?.focus()
}
</script>
<template>
  <section class="content-section">
    <template v-if="readonly">
      <PortalHeading tag="h2">{{ definition.title[locale] }}</PortalHeading>
      <dl>
        <template v-for="question in readQuestions" :key="question.id"
          ><dt>{{ question.label[locale] }}</dt>
          <dd>
            {{
              question.type === 'select'
                ? (question.options.find((option) => option.value === answers[question.id])?.label[
                    locale
                  ] ?? '—')
                : answers[question.id] === ''
                  ? '—'
                  : (answers[question.id] ?? '—')
            }}
          </dd></template
        >
      </dl>
    </template>
    <HeadlessSurvey v-else v-model="answers" :definition="definition" :locale="locale">
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
              <PortalHeading v-if="definition.schemaVersion === 2" tag="h3">
                {{ s('page') }} {{ pageIndex + 1 }}: {{ page.title[locale] }}
              </PortalHeading>
              <PortalText v-if="page.description">{{ page.description[locale] }}</PortalText>
              <SurveyFields :fields="fields" :ids="page.questionIds" :prefix="prefix" />
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
            <PortalButton v-if="canBack" variant="secondary" @click="navigate(back)">{{
              s('previousPage')
            }}</PortalButton>
            <PortalButton v-if="!complete" type="submit">{{
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

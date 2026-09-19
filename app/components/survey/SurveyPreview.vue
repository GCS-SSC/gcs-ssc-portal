<script setup lang="ts">
import { HeadlessSurvey } from '@gcs-ssc/survey/vue'
import type { SurveyDefinition } from '@gcs-ssc/survey'
import SurveyFields from './SurveyFields.vue'
const props = defineProps<{ definition: SurveyDefinition }>()
const { locale } = useLocale(),
  { s } = useSurveyLocale()
const answers = ref<Record<string, string>>({})
const prefix = useId()
watch(
  () => props.definition,
  () => {
    answers.value = {}
  },
  { deep: true }
)
const navigate = async (action: (() => boolean) | (() => void)) => {
  const result = action()
  await nextTick()
  document.getElementById(`${prefix}-${result === false ? 'errors' : 'page'}`)?.focus()
}
</script>
<template>
  <section class="content-section" data-survey-preview>
    <h2>{{ s('preview') }}</h2>
    <p>{{ s('previewHint') }}</p>
    <HeadlessSurvey v-model="answers" :definition="definition" :locale="locale">
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
        <h3>{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
        <form class="portal-form" novalidate @submit.prevent="navigate(next)">
          <div
            v-if="Object.keys(errors).length"
            :id="`${prefix}-errors`"
            data-survey-errors
            tabindex="-1"
          >
            <ThemeNotice variant="error">{{ s('validation') }}</ThemeNotice>
          </div>
          <div :id="`${prefix}-page`" class="survey-page" tabindex="-1">
            <template v-if="complete">
              <ThemeNotice variant="success">{{ s('valid') }}</ThemeNotice>
              <p>{{ s('previewComplete') }}</p>
            </template>
            <template v-else-if="page">
              <h4 v-if="definition.schemaVersion === 2">
                {{ s('page') }} {{ pageIndex + 1 }}: {{ page.title[locale] }}
              </h4>
              <p v-if="page.description">{{ page.description[locale] }}</p>
              <SurveyFields :fields="fields" :ids="page.questionIds" :prefix="prefix" />
              <section
                v-for="section in page.sections"
                :key="section.id"
                :aria-labelledby="`${prefix}-${section.id}`"
                class="content-section"
              >
                <h5 :id="`${prefix}-${section.id}`">{{ section.title[locale] }}</h5>
                <p v-if="section.description">{{ section.description[locale] }}</p>
                <SurveyFields :fields="fields" :ids="section.questionIds" :prefix="prefix" />
                <section
                  v-for="subsection in section.subsections"
                  :key="subsection.id"
                  :aria-labelledby="`${prefix}-${subsection.id}`"
                  class="content-section"
                >
                  <h6 :id="`${prefix}-${subsection.id}`">{{ subsection.title[locale] }}</h6>
                  <p v-if="subsection.description">{{ subsection.description[locale] }}</p>
                  <SurveyFields :fields="fields" :ids="subsection.questionIds" :prefix="prefix" />
                </section>
              </section>
            </template>
          </div>
          <div class="form-actions">
            <ThemeButton v-if="canBack" variant="secondary" @click="navigate(back)">{{
              s('previousPage')
            }}</ThemeButton>
            <ThemeButton v-if="!complete" type="submit">{{
              s(isLastPage ? 'check' : 'nextPage')
            }}</ThemeButton>
          </div>
        </form>
      </template>
    </HeadlessSurvey>
  </section>
</template>

<style scoped>
h3 {
  font-size: 1.5rem;
}
.survey-page h4,
.survey-page h5,
.survey-page h6 {
  font-family: Lato, Arial, sans-serif;
  color: var(--portal-ink);
  font-weight: 700;
  line-height: 1.4;
  margin: 0 0 0.8rem;
}
.survey-page h4 {
  font-size: 1.3rem;
}
.survey-page h5 {
  font-size: 1.2rem;
}
.survey-page h6 {
  font-size: 1.125rem;
}
.survey-page .content-section {
  border-top: 0;
  padding-top: 0;
  margin-top: 1.5rem;
}
</style>

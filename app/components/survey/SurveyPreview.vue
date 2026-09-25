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
    <PortalHeading tag="h2">{{ s('preview') }}</PortalHeading>
    <PortalText>{{ s('previewHint') }}</PortalText>
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
        <PortalHeading tag="h3">{{ title }}</PortalHeading>
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
              <PortalText>{{ s('previewComplete') }}</PortalText>
            </template>
            <template v-else-if="page">
              <PortalHeading v-if="definition.schemaVersion === 2" tag="h4">
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
                <PortalHeading :id="`${prefix}-${section.id}`" tag="h5">{{
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
                  <PortalHeading :id="`${prefix}-${subsection.id}`" tag="h6">{{
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

<script setup lang="ts">
import type { SurveyDefinition } from '@gcs-ssc/survey'
import SurveyPreview from '~/components/survey/SurveyPreview.vue'
definePageMeta({ key: (route) => `${route.params.organizationId}-${route.params.callId}` })
const route = useRoute(),
  api = usePortalApi(),
  message = useApiMessage()
const { s } = useSurveyLocale(),
  { locale, t } = useLocale()
const { data, error, refresh } = await useAsyncData(
  `application-form-${route.params.organizationId}-${route.params.callId}`,
  () =>
    api<{ survey: { nameEn: string; nameFr: string; definition: SurveyDefinition }; forms: Array<{ surveyId: string; revision: number; definition: SurveyDefinition }> }>(
      `/api/organizations/${route.params.organizationId}/funding-calls/${route.params.callId}/survey`
    )
)
useHead(() => ({ title: s('view') }))
</script>
<template>
  <section>
    <PortalLink :to="`/organizations/${route.params.organizationId}?section=funding`">{{
      s('back')
    }}</PortalLink>
    <PortalNotice v-if="error" variant="error"
      >{{ message(error) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    >
    <template v-else-if="data"
      ><PortalHeading tag="h1">{{
        data.survey[locale === 'en' ? 'nameEn' : 'nameFr']
      }}</PortalHeading>
      <SurveyPreview
        v-for="form in data.forms" :key="`${form.surveyId}-${form.revision}`"
        :definition="form.definition" :show-title="true" /></template>
  </section>
</template>

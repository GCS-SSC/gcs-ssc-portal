<script setup lang="ts">
import type { SurveySummary } from '~~/shared/types/survey'
import type { Agency } from '~~/shared/types/government'
definePageMeta({ key: (route) => String(route.query.agencyId) })
const agencyId = String(useRoute().query.agencyId ?? '')
const { s } = useSurveyLocale(),
  { locale, t } = useLocale(),
  { localized } = useGovernmentLocale()
const api = usePortalApi(),
  message = useApiMessage()
const { data, error, refresh } = await useAsyncData(`surveys-${agencyId}`, async () => {
  const [forms, structure] = await Promise.all([
    api<{ surveys: SurveySummary[] }>(`/api/government/agencies/${agencyId}/surveys`),
    api<{ agency: Agency }>(`/api/government/agencies/${agencyId}`)
  ])
  return { ...forms, agency: structure.agency }
})
useHead(() => ({ title: s('surveys') }))
</script>
<template>
  <section>
    <ThemeLink :to="`/government/agencies/${agencyId}`">{{
      data ? localized(data.agency) : s('agency')
    }}</ThemeLink>
    <h1>{{ s('surveys') }}</h1>
    <p class="lead">{{ s('intro') }}</p>
    <ThemeNotice v-if="error" variant="error"
      >{{ message(error) }}
      <ThemeButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</ThemeButton></ThemeNotice
    >
    <template v-else-if="data">
      <ThemeLink class="primary-link" :to="`/government/surveys/new?agencyId=${agencyId}`">{{
        s('newSurvey')
      }}</ThemeLink>
      <ul v-if="data.surveys.length" class="organization-list">
        <li v-for="survey in data.surveys" :key="survey.id">
          <div>
            <h2>
              <ThemeLink :to="`/government/surveys/${survey.id}`">{{
                survey.title[locale]
              }}</ThemeLink>
            </h2>
            <p>{{ s('revision') }} {{ survey.revision }}</p>
          </div>
        </li>
      </ul>
      <p v-else>{{ s('empty') }}</p>
    </template>
  </section>
</template>

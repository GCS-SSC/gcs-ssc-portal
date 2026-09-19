<script setup lang="ts">
import type { FundingCase, SubmissionSet } from '~~/shared/types/cases'
definePageMeta({ key: (route) => route.fullPath })
const agencyId = String(useRoute().query.agencyId ?? '')
const { c, errorMessage } = useCaseLocale(),
  { localized } = useGovernmentLocale()
const api = usePortalApi()
const offset = ref(0)
const { data, error, refresh } = await useAsyncData(`cases-${agencyId}`, async () => {
  const [cases, sets, exports] = await Promise.all([
    api<{ cases: FundingCase[] }>(`/api/government/agencies/${agencyId}/cases`),
    api<{ sets: SubmissionSet[] }>(`/api/government/agencies/${agencyId}/sets`),
    api<{
      submissions: {
        submissionId: string
        submittedAt: string
        organizationId: string
        organizationName: string
        nameEn: string
        nameFr: string
      }[]
      nextOffset: number | null
    }>(`/api/government/agencies/${agencyId}/submissions?offset=${offset.value}`)
  ])
  return { ...cases, ...sets, ...exports }
})
const next = async () => {
  offset.value = data.value?.nextOffset ?? 0
  await refresh()
}
</script>
<template>
  <section>
    <ThemeLink :to="`/government/agencies/${agencyId}`">{{ c('back') }}</ThemeLink>
    <h1>{{ c('cases') }}</h1>
    <ThemeNotice v-if="error" variant="error"
      >{{ errorMessage(error) }}
      <ThemeButton @click="refresh()">{{ c('reload') }}</ThemeButton></ThemeNotice
    >
    <template v-else-if="data">
      <ThemeLink :to="`/government/cases/new?agencyId=${agencyId}`">{{ c('newCase') }}</ThemeLink>
      <p v-if="!data.cases.length">{{ c('empty') }}</p>
      <ul class="service-list">
        <li v-for="entry in data.cases" :key="entry.id">
          <ThemeLink :to="`/government/cases/${entry.id}?agencyId=${agencyId}`">{{
            localized(entry)
          }}</ThemeLink
          ><span>{{ entry.agreementNumber }}</span>
        </li>
      </ul>
      <section class="content-section">
        <h2>{{ c('sets') }}</h2>
        <ThemeLink :to="`/government/sets/new?agencyId=${agencyId}`">{{ c('newSet') }}</ThemeLink>
        <p v-if="!data.sets.length">{{ c('empty') }}</p>
        <ul class="service-list">
          <li v-for="entry in data.sets" :key="entry.id">
            <ThemeLink :to="`/government/sets/${entry.id}?agencyId=${agencyId}`">{{
              localized(entry)
            }}</ThemeLink
            ><ThemeBadge>{{ c(entry.published ? 'published' : 'draft') }}</ThemeBadge>
          </li>
        </ul>
      </section>
      <section class="content-section">
        <h2>{{ c('exports') }}</h2>
        <p v-if="!data.submissions.length">{{ c('empty') }}</p>
        <ul class="service-list">
          <li v-for="entry in data.submissions" :key="entry.submissionId">
            <ThemeLink :to="`/government/submissions/${entry.submissionId}`">{{
              localized(entry)
            }}</ThemeLink>
            <span>{{ entry.organizationName }} · {{ entry.submittedAt }}</span
            ><a
              :href="`/api/government/submissions/${entry.submissionId}`"
              :download="`${entry.submissionId}.json`"
              >{{ c('download') }}</a
            >
          </li>
        </ul>
        <ThemeButton v-if="data.nextOffset !== null" @click="next">{{ c('nextItem') }}</ThemeButton>
      </section>
    </template>
  </section>
</template>

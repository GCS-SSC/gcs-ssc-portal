<script setup lang="ts">
import type { ResponseSummary } from '~~/shared/types/agreements'

const props = defineProps<{
  organizationId: string
  category: 'claims' | 'forecasts' | 'other'
  status: ResponseSummary['status']
  responses: ResponseSummary[]
}>()
const { c } = useAgreementLocale()
const { localized } = useGovernmentLocale()
const { locale, date } = useLocale()
const search = ref('')
const heading = computed(() =>
  c(
    props.status === 'draft'
      ? 'inProgress'
      : props.status === 'awaiting_documentation'
        ? 'awaitingDocumentationSection'
        : 'submitted'
  )
)
const columns = computed(() => [
  { field: 'submissionId', header: c(props.category === 'other' ? 'formName' : 'submissionId') },
  ...(props.category === 'claims'
    ? [
        { field: 'periodStart', header: c('claimPeriodStart') },
        { field: 'periodEnd', header: c('claimPeriodEnd') },
        { field: 'finalClaim', header: c('finalClaim') }
      ]
    : props.category === 'forecasts'
      ? [
          { field: 'fiscalYear', header: c('forecastFiscalYear') },
          { field: 'iteration', header: c('forecastIteration') }
        ]
      : []),
  { field: 'status', header: c('gcsStatus') },
  { field: 'updated', header: c('updated') }
])
const monthKeys = [
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
  'january',
  'february',
  'march'
] as const
const month = (value: number | null) =>
  c(value === null ? 'unknown' : (monthKeys[value] ?? 'unknown'))
const year = (value: number | null) =>
  value === null ? c('unknown') : `${value}–${String(value + 1).slice(-2)}`
const finalClaim = (value: boolean | null) => c(value === null ? 'unknown' : value ? 'yes' : 'no')
const code = (response: ResponseSummary) =>
  response.codes[
    props.category === 'claims' ? 'claim' : props.category === 'forecasts' ? 'forecast' : 'other'
  ]
const rows = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  return props.responses.filter((response) => {
    if (response.status !== props.status) return false
    if (!query) return true
    return [
      response.nameEn,
      response.nameFr,
      code(response) ?? '',
      response.gcsStatus?.en ?? '',
      response.gcsStatus?.fr ?? '',
      props.category === 'claims' ? month(response.claimPeriodStart) : '',
      props.category === 'claims' ? month(response.claimPeriodEnd) : '',
      props.category === 'claims' ? finalClaim(response.finalClaim) : '',
      props.category === 'forecasts' ? year(response.forecastFiscalYear) : '',
      props.category === 'forecasts' ? String(response.forecastIteration ?? '') : ''
    ]
      .join(' ')
      .toLocaleLowerCase()
      .includes(query)
  })
})
const count = computed(
  () => props.responses.filter((response) => response.status === props.status).length
)
</script>

<template>
  <section class="submission-section" :aria-label="heading">
    <PortalHeading tag="h3" margin-top="0">{{ heading }}</PortalHeading>
    <PortalSearch
      :id="`search-${status}`"
      v-model="search"
      :label="`${c('searchSubmissions')} — ${heading}`"
    />
    <PortalText v-if="!count">{{ c('noSubmissions') }}</PortalText>
    <PortalText v-else-if="!rows.length" role="status">{{ c('noMatchingSubmissions') }}</PortalText>
    <div v-else class="table-scroll">
      <PortalTable :label="heading" :rows="rows" :columns="columns">
        <template #submissionId="{ row: response }">
          <PortalLink :to="`/organizations/${organizationId}/responses/${response.id}`">{{
            code(response) ?? c('unknown')
          }}</PortalLink>
          <span v-if="category === 'other'" class="table-secondary">{{ localized(response) }}</span>
        </template>
        <template #periodStart="{ row: response }">{{ month(response.claimPeriodStart) }}</template>
        <template #periodEnd="{ row: response }">{{ month(response.claimPeriodEnd) }}</template>
        <template #finalClaim="{ row: response }">{{ finalClaim(response.finalClaim) }}</template>
        <template #fiscalYear="{ row: response }">{{ year(response.forecastFiscalYear) }}</template>
        <template #iteration="{ row: response }">{{
          response.forecastIteration ?? c('unknown')
        }}</template>
        <template #status="{ row: response }">
          <span v-if="response.gcsStatus" class="submission-status-badge">
            <PortalBadge :colour="response.gcsStatus.colour">{{
              response.gcsStatus[locale]
            }}</PortalBadge>
          </span>
          <span v-else>{{ c('unknown') }}</span>
        </template>
        <template #updated="{ row: response }">{{ date(response.updatedAt) }}</template>
      </PortalTable>
    </div>
  </section>
</template>

<style scoped>
.submission-section {
  margin-block-start: var(--gcds-spacing-600);
}
.submission-status-badge {
  display: inline-block;
  width: max-content;
  max-width: 100%;
}
.submission-status-badge :deep(.gc-status) {
  box-sizing: border-box;
  max-width: 100%;
  white-space: normal;
  overflow-wrap: break-word;
}
</style>

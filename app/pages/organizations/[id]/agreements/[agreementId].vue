<script setup lang="ts">
import type {
  OrganizationAgreementSummary,
  SubmissionSet,
  SetResponse,
  ResponseSummary
} from '~~/shared/types/agreements'
import type { Organization } from '~~/shared/types/api'
import { setSubjects } from '~~/shared/schemas/agreements'
import { hasAccess } from '~~/shared/utils/permissions'

definePageMeta({ key: (route) => `${route.params.id}-${route.params.agreementId}` })
const route = useRoute()
const id = String(route.params.id)
const agreementId = String(route.params.agreementId)
const base = `/api/organizations/${encodeURIComponent(id)}`
const pagePath = `/organizations/${encodeURIComponent(id)}/agreements/${encodeURIComponent(agreementId)}`
const api = usePortalApi()
const { c, errorMessage } = useAgreementLocale()
const { g, localized } = useGovernmentLocale()
const { locale, t } = useLocale()
const { busy, error, perform } = useAgreementAction()
const sections = ['overview', 'claims', 'forecasts', 'other'] as const
type Section = (typeof sections)[number]
type SubmissionCategory = Exclude<Section, 'overview'>
const categoryForKinds = (
  kinds: ReadonlyArray<'claim' | 'forecast' | 'survey'>
): SubmissionCategory =>
  kinds.includes('claim') ? 'claims' : kinds.includes('forecast') ? 'forecasts' : 'other'
const section = computed<Section>(() =>
  sections.includes(route.query.section as Section) ? (route.query.section as Section) : 'overview'
)
const {
  data,
  error: loadError,
  refresh,
  status: loadStatus
} = await useAsyncData(`agreement-page-${id}-${agreementId}`, async () => {
  const [organizationResult, agreementResult, setResult, responseResult] = await Promise.all([
    api<{ organization: Organization }>(base),
    api<{ agreements: OrganizationAgreementSummary[] }>(`${base}/agreements`),
    api<{ sets: SubmissionSet[] }>(`${base}/sets`),
    api<{ responses: ResponseSummary[] }>(`${base}/responses`)
  ])
  return {
    organization: organizationResult.organization,
    agreement: agreementResult.agreements.find((item) => item.id === agreementId) ?? null,
    sets: setResult.sets.filter((item) => item.agreementId === agreementId),
    responses: responseResult.responses.filter((item) => item.agreementId === agreementId)
  }
})
const menu = computed(() => [
  { to: pagePath, label: t('overview'), current: section.value === 'overview' },
  {
    to: `${pagePath}?section=claims`,
    label: c('claims'),
    current: section.value === 'claims'
  },
  {
    to: `${pagePath}?section=forecasts`,
    label: c('forecasts'),
    current: section.value === 'forecasts'
  },
  {
    to: `${pagePath}?section=other`,
    label: c('otherSubmissions'),
    current: section.value === 'other'
  }
])
const showSets = ref(false)
watch(section, (next) => {
  showSets.value = false
  if (next !== 'overview') void refresh()
})
onMounted(() => {
  if (section.value !== 'overview') void refresh()
})
const availableSets = computed(() =>
  (data.value?.sets ?? []).filter(
    (set) => categoryForKinds(set.items.map((item) => item.kind)) === section.value
  )
)
const canStart = (set: SubmissionSet) =>
  setSubjects(set.items).every((subject) =>
    hasAccess(data.value?.organization.permissions ?? [], subject, 'contributor')
  )
const categoryResponses = computed(() =>
  (data.value?.responses ?? []).filter(
    (response) => categoryForKinds(response.kinds) === section.value
  )
)
const categoryTitle = computed(() =>
  c(
    section.value === 'claims'
      ? 'claims'
      : section.value === 'forecasts'
        ? 'forecasts'
        : 'otherSubmissions'
  )
)
useHead(() => ({
  title: data.value?.agreement ? localized(data.value.agreement) : c('agreementTitle')
}))
const start = (set: SubmissionSet) =>
  perform(async () => {
    const result = await api<{ response: SetResponse }>(`${base}/sets/${set.id}/responses`, {
      method: 'POST',
      body: { locale: locale.value }
    })
    await navigateTo(`/organizations/${id}/responses/${result.response.id}`)
  })
const startNew = () => {
  if (availableSets.value.length === 1 && canStart(availableSets.value[0]!)) {
    start(availableSets.value[0]!)
    return
  }
  showSets.value = !showSets.value
}
</script>

<template>
  <section>
    <PortalText v-if="loadStatus === 'pending' && !data" role="status">{{
      t('loading')
    }}</PortalText>
    <PortalNotice v-else-if="loadError" variant="error">
      {{ errorMessage(loadError) }}
      <PortalButton @click="refresh()">{{ c('reload') }}</PortalButton>
    </PortalNotice>
    <PortalNotice v-else-if="data && !data.agreement" variant="error">
      {{ c('agreementUnavailable') }}
    </PortalNotice>
    <template v-else-if="data?.agreement">
      <PortalWorkspace
        :title="localized(data.agreement)"
        :navigation-label="c('manageAgreement')"
        :items="menu"
      >
        <template #statuses>
          <PortalBadge :tone="data.agreement.active ? 'success' : 'neutral'">{{
            t(data.agreement.active ? 'active' : 'inactive')
          }}</PortalBadge>
          <PortalBadge v-if="data.agreement.status" :colour="data.agreement.status.colour">{{
            data.agreement.status[locale]
          }}</PortalBadge>
        </template>
        <template #default>
          <PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice>
          <template v-if="section === 'overview'">
            <PortalHeading tag="h2" margin-top="0">{{ t('overview') }}</PortalHeading>
            <dl class="detail-list">
              <div>
                <dt>{{ c('agreementNumber') }}</dt>
                <dd>
                  <code>{{ data.agreement.agreementNumber }}</code>
                </dd>
              </div>
              <div>
                <dt>{{ g('agency') }}</dt>
                <dd>
                  {{
                    localized({
                      nameEn: data.agreement.agencyNameEn,
                      nameFr: data.agreement.agencyNameFr
                    })
                  }}
                </dd>
              </div>
            </dl>
          </template>
          <template v-else>
            <PortalHeading tag="h2" margin-top="0">{{ categoryTitle }}</PortalHeading>
            <PortalButton :disabled="busy || !availableSets.some(canStart)" @click="startNew">{{
              c('newSubmission')
            }}</PortalButton>
            <PortalText v-if="!availableSets.length">{{ c('empty') }}</PortalText>
            <PortalText v-else-if="!availableSets.some(canStart)">{{ c('viewOnly') }}</PortalText>
            <section v-if="showSets" class="content-section">
              <PortalHeading tag="h3" margin-top="0">{{ c('availableForms') }}</PortalHeading>
              <ul class="available-form-list">
                <li v-for="set in availableSets" :key="set.id">
                  <PortalLink :to="`/organizations/${id}/sets/${set.id}`">{{
                    localized(set)
                  }}</PortalLink>
                  <PortalButton
                    v-if="canStart(set)"
                    variant="secondary"
                    :disabled="busy"
                    @click="start(set)"
                    >{{ c('start') }}</PortalButton
                  >
                </li>
              </ul>
            </section>
            <AgreementSubmissionSection
              v-for="status in ['draft', 'awaiting_documentation', 'submitted'] as const"
              :key="`${section}-${status}`"
              :organization-id="id"
              :category="section"
              :status="status"
              :responses="categoryResponses"
            />
          </template>
        </template>
      </PortalWorkspace>
    </template>
  </section>
</template>

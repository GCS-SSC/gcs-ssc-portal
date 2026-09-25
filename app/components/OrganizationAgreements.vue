<script setup lang="ts">
import type {
  OrganizationAgreementSummary,
  SubmissionSet,
  SetResponse
} from '~~/shared/types/agreements'
import type { Organization } from '~~/shared/types/api'
import { setSubjects } from '~~/shared/schemas/agreements'
import { hasAccess } from '~~/shared/utils/permissions'
const props = defineProps<{ organizationId: string; embedded?: boolean }>()
const id = props.organizationId,
  base = `/api/organizations/${id}`
const api = usePortalApi(),
  { c, errorMessage } = useAgreementLocale(),
  { g, localized } = useGovernmentLocale(),
  { locale, t } = useLocale()
const route = useRoute()
const { busy, error, perform } = useAgreementAction()
const {
  data,
  error: loadError,
  refresh,
  status: loadStatus
} = useAsyncData(`agreements-${id}`, async () => {
  const [organization, sets, agreementResult] = await Promise.all([
    api<{ organization: Organization }>(base),
    api<{ sets: SubmissionSet[] }>(`${base}/sets`),
    api<{ agreements: OrganizationAgreementSummary[] }>(`${base}/agreements`)
  ])
  return { ...organization, ...sets, agreements: agreementResult.agreements }
})
const selectedAgreement = computed(() =>
  data.value?.agreements.find((entry) => entry.id === route.query.agreement)
)
const agreementSets = computed(
  () => data.value?.sets.filter((set) => set.agreementId === selectedAgreement.value?.id) ?? []
)
const standaloneSets = computed(() => data.value?.sets.filter((set) => !set.agreementId) ?? [])
const start = (set: SubmissionSet) =>
  perform(async () => {
    const result = await api<{ response: SetResponse }>(`${base}/sets/${set.id}/responses`, {
      method: 'POST',
      body: { locale: locale.value }
    })
    await navigateTo(`/organizations/${id}/responses/${result.response.id}`)
  })
</script>
<template>
  <section>
    <PortalLink v-if="!embedded" :to="`/organizations/${id}`">{{ c('back') }}</PortalLink>
    <PortalHeading :tag="embedded ? 'h2' : 'h1'" margin-top="0">{{
      c('agreements')
    }}</PortalHeading>
    <PortalText v-if="loadStatus === 'pending'" role="status">{{ t('loading') }}</PortalText>
    <PortalNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <PortalButton @click="refresh()">{{ c('reload') }}</PortalButton></PortalNotice
    >
    <PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice>
    <template v-if="data">
      <template v-if="!selectedAgreement">
        <PortalText v-if="!data.agreements.length">{{ c('empty') }}</PortalText>
        <ul class="record-summary-list">
          <RecordSummary
            v-for="agreement in data.agreements"
            :key="agreement.id"
            as="li"
            :heading-tag="embedded ? 'h3' : 'h2'"
          >
            <template #title>{{ localized(agreement) }}</template>
            <template #details>
              <PortalText size="small" text-role="secondary" margin-bottom="100"
                >{{ g('agency') }}:
                {{ localized({ nameEn: agreement.agencyNameEn, nameFr: agreement.agencyNameFr }) }}
              </PortalText>
              <PortalText size="small" text-role="secondary" margin-bottom="100"
                >{{ c('agreementNumber') }}:
                <code>{{ agreement.agreementNumber }}</code></PortalText
              >
            </template>
            <template #actions>
              <PortalBadge :tone="agreement.active ? 'success' : 'neutral'">{{
                t(agreement.active ? 'active' : 'inactive')
              }}</PortalBadge>
              <PortalBadge v-if="agreement.status" :colour="agreement.status.colour">{{
                agreement.status[locale]
              }}</PortalBadge>
            </template>
            <template #cta>
              <PortalLink
                variant="button"
                size="small"
                button-role="secondary"
                :to="`/organizations/${id}?section=agreements&agreement=${agreement.id}`"
                :aria-label="`${c('openAgreement')}: ${localized(agreement)}`"
                >{{ c('openAgreement') }}</PortalLink
              >
            </template>
          </RecordSummary>
        </ul>
        <section v-if="standaloneSets.length" class="content-section">
          <PortalHeading :tag="embedded ? 'h3' : 'h2'" margin-top="0">{{
            c('form')
          }}</PortalHeading>
          <ul class="organization-list">
            <li v-for="set in standaloneSets" :key="set.id">
              <PortalLink :to="`/organizations/${id}/sets/${set.id}`">{{
                localized(set)
              }}</PortalLink>
            </li>
          </ul>
        </section>
      </template>
      <template v-else>
        <PortalLink :to="`/organizations/${id}?section=agreements`">{{
          c('agreements')
        }}</PortalLink>
        <PortalHeading :tag="embedded ? 'h3' : 'h2'">{{
          localized(selectedAgreement)
        }}</PortalHeading>
        <div class="badges">
          <PortalBadge :tone="selectedAgreement.active ? 'success' : 'neutral'">{{
            t(selectedAgreement.active ? 'active' : 'inactive')
          }}</PortalBadge>
          <PortalBadge v-if="selectedAgreement.status" :colour="selectedAgreement.status.colour">{{
            selectedAgreement.status[locale]
          }}</PortalBadge>
        </div>
        <PortalText
          >{{ c('agreementNumber') }}:
          <code>{{ selectedAgreement.agreementNumber }}</code></PortalText
        >
        <PortalHeading :tag="embedded ? 'h4' : 'h3'">{{ c('sets') }}</PortalHeading>
        <PortalText v-if="!agreementSets.length">{{ c('empty') }}</PortalText>
        <ul class="service-list">
          <li v-for="set in agreementSets" :key="set.id">
            <PortalLink :to="`/organizations/${id}/sets/${set.id}`">{{
              localized(set)
            }}</PortalLink>
            <span>{{ set.items.map((item) => c(item.kind)).join(' → ') }}</span>
            <PortalButton
              v-if="
                setSubjects(set.items).every((subject) =>
                  hasAccess(data!.organization.permissions, subject, 'contributor')
                )
              "
              variant="secondary"
              :disabled="busy"
              @click="start(set)"
              >{{ c('start') }}</PortalButton
            >
            <span v-else>{{ c('viewOnly') }}</span>
          </li>
        </ul>
      </template>
    </template>
  </section>
</template>

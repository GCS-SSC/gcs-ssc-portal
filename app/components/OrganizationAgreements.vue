<script setup lang="ts">
import type { OrganizationAgreementSummary, SubmissionSet } from '~~/shared/types/agreements'
const props = defineProps<{ organizationId: string; embedded?: boolean }>()
const id = props.organizationId,
  base = `/api/organizations/${id}`
const api = usePortalApi(),
  { c, errorMessage } = useAgreementLocale(),
  { g, localized } = useGovernmentLocale(),
  { locale, t } = useLocale()
const {
  data,
  error: loadError,
  refresh,
  status: loadStatus
} = useAsyncData(`agreements-${id}`, async () => {
  const [sets, agreementResult] = await Promise.all([
    api<{ sets: SubmissionSet[] }>(`${base}/sets`),
    api<{ agreements: OrganizationAgreementSummary[] }>(`${base}/agreements`)
  ])
  return { ...sets, agreements: agreementResult.agreements }
})
const standaloneSets = computed(() => data.value?.sets.filter((set) => !set.agreementId) ?? [])
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
    <template v-if="data">
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
              >{{ c('agreementNumber') }}: <code>{{ agreement.agreementNumber }}</code></PortalText
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
              :to="`/organizations/${id}/agreements/${agreement.id}`"
              :aria-label="`${c('openAgreement')}: ${localized(agreement)}`"
              >{{ c('openAgreement') }}</PortalLink
            >
          </template>
        </RecordSummary>
      </ul>
      <section v-if="standaloneSets.length" class="content-section">
        <PortalHeading :tag="embedded ? 'h3' : 'h2'" margin-top="0">{{ c('form') }}</PortalHeading>
        <ul class="organization-list">
          <li v-for="set in standaloneSets" :key="set.id">
            <PortalLink :to="`/organizations/${id}/sets/${set.id}`">{{
              localized(set)
            }}</PortalLink>
          </li>
        </ul>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { hasAccess } from '~~/shared/utils/permissions'
import type { ResponseResult } from '~~/shared/types/agreements'
import type { FundingCall } from '~~/shared/types/government'
import type { Organization } from '~~/shared/types/api'
const props = defineProps<{ organizationId: string; embedded?: boolean }>()
const id = props.organizationId
const { g, localized } = useGovernmentLocale()
const { t } = useLocale()
const { s } = useSurveyLocale()
const { a } = useAttachmentLocale(),
  { c } = useAgreementLocale(),
  { locale } = useLocale()
const { busy, error: actionError, perform } = useAgreementAction()
const api = usePortalApi(),
  message = useApiMessage()
const search = ref('')
const {
  data,
  error,
  refresh,
  status: loadStatus
} = useAsyncData(`funding-${id}`, async () => {
  const funding = await api<{ calls: FundingCall[] }>(`/api/organizations/${id}/funding-calls`)
  const { organization } = await api<{ organization: Organization }>(`/api/organizations/${id}`)
  const { responses } = await api<{
    responses: {
      id: string
      callId: string | null
      nameEn: string
      nameFr: string
      status: 'draft' | 'submitted'
    }[]
  }>(`/api/organizations/${id}/responses`)
  return { ...funding, organization, responses: responses.filter((response) => response.callId) }
})
const status = (call: FundingCall) => {
  const today = new Date().toISOString().slice(0, 10)
  return today < call.startDate ? 'upcoming' : today > call.endDate ? 'closed' : 'open'
}
const agencyGroups = computed(() => {
  const query = search.value.trim().toLocaleLowerCase()
  const groups = new Map<string, { name: string; calls: FundingCall[] }>()
  for (const call of data.value?.calls ?? []) {
    const agencyName = localized({ nameEn: call.agencyNameEn, nameFr: call.agencyNameFr })
    const searchable = [
      agencyName,
      localized(call),
      localized({ nameEn: call.programNameEn, nameFr: call.programNameFr }),
      localized({ nameEn: call.streamNameEn, nameFr: call.streamNameFr })
    ]
      .join(' ')
      .toLocaleLowerCase()
    if (query && !searchable.includes(query)) continue
    if (!groups.has(call.agencyId)) groups.set(call.agencyId, { name: agencyName, calls: [] })
    groups.get(call.agencyId)!.calls.push(call)
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))
})
const start = (callId: string) =>
  perform(async () => {
    const result = await api<ResponseResult>(
      `/api/organizations/${id}/funding-calls/${callId}/applications`,
      { method: 'POST', body: { locale: locale.value } }
    )
    await navigateTo(`/organizations/${id}/responses/${result.response.id}`)
  })
</script>
<template>
  <section>
    <PortalLink v-if="!embedded" :to="`/organizations/${id}`">{{
      data?.organization.name || g('back')
    }}</PortalLink>
    <PortalHeading :tag="embedded ? 'h2' : 'h1'" margin-top="0">{{ g('apply') }}</PortalHeading>
    <PortalText v-if="loadStatus === 'pending'" role="status">{{ t('loading') }}</PortalText>
    <PortalNotice v-if="error" variant="error"
      >{{ message(error) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    >
    <PortalNotice v-if="actionError" variant="error">{{ actionError }}</PortalNotice>
    <template v-if="data && !error">
      <section v-if="data.responses.length" class="content-section">
        <PortalHeading :tag="embedded ? 'h3' : 'h2'">{{ a('applications') }}</PortalHeading>
        <ul>
          <li v-for="response in data.responses" :key="response.id">
            <PortalLink :to="`/organizations/${id}/responses/${response.id}`"
              >{{ localized(response) }} — {{ c(response.status) }}</PortalLink
            >
          </li>
        </ul>
      </section>
      <PortalText>{{ g('fundingIntro') }}</PortalText>
      <PortalText>{{ g('fundingScope') }}</PortalText>
      <PortalText v-if="!data.calls.length">{{ g('noFunding') }}</PortalText>
      <PortalInput
        v-if="data.calls.length"
        id="funding-search"
        v-model="search"
        :label="g('searchCalls')"
      />
      <PortalText v-if="data.calls.length && !agencyGroups.length" role="status">{{
        g('noMatchingCalls')
      }}</PortalText>
      <section v-for="group in agencyGroups" :key="group.name" class="content-section">
        <PortalHeading :tag="embedded ? 'h3' : 'h2'" margin-top="0">{{ group.name }}</PortalHeading>
        <RecordSummary
          v-for="call in group.calls"
          :key="call.id"
          as="section"
          :heading-tag="embedded ? 'h4' : 'h3'"
        >
          <template #title>{{ localized(call) }}</template>
          <template #details>
            <PortalText size="small" text-role="secondary" margin-bottom="100">
              {{ localized({ nameEn: call.programNameEn, nameFr: call.programNameFr }) }} ·
              {{ localized({ nameEn: call.streamNameEn, nameFr: call.streamNameFr }) }}
            </PortalText>
            <PortalText size="small" text-role="secondary" margin-bottom="100">
              {{ g('startDate') }}: {{ call.startDate }} · {{ g('endDate') }}: {{ call.endDate }}
            </PortalText>
          </template>
          <template #actions>
            <PortalBadge :tone="status(call) === 'open' ? 'success' : 'neutral'">{{
              g(status(call))
            }}</PortalBadge>
            <PortalLink v-if="call.surveyId" :to="`/forms/${id}/${call.id}`">{{
              s('view')
            }}</PortalLink>
          </template>
          <template
            v-if="
              call.surveyId &&
              status(call) === 'open' &&
              hasAccess(data.organization.permissions, 'application', 'contributor')
            "
            #cta
          >
            <PortalButton
              size="small"
              variant="secondary"
              :disabled="busy"
              @click="start(call.id)"
              >{{ a('start') }}</PortalButton
            >
          </template>
        </RecordSummary>
      </section>
    </template>
  </section>
</template>

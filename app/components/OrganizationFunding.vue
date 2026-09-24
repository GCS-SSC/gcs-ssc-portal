<script setup lang="ts">
import { hasAccess } from '~~/shared/utils/permissions'
import type { ResponseResult } from '~~/shared/types/cases'
import type { FundingCall } from '~~/shared/types/government'
import type { Organization } from '~~/shared/types/api'
const props = defineProps<{ organizationId: string; embedded?: boolean }>()
const id = props.organizationId
const { g, localized } = useGovernmentLocale()
const { t } = useLocale()
const { s } = useSurveyLocale()
const { a } = useAttachmentLocale(),
  { c } = useCaseLocale(),
  { locale } = useLocale()
const { busy, error: actionError, perform } = useCaseAction()
const api = usePortalApi(),
  message = useApiMessage()
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
    <component :is="embedded ? 'h2' : 'h1'">{{ g('apply') }}</component>
    <p v-if="loadStatus === 'pending'" role="status">{{ t('loading') }}</p>
    <PortalNotice v-if="error" variant="error"
      >{{ message(error) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    >
    <PortalNotice v-if="actionError" variant="error">{{ actionError }}</PortalNotice>
    <template v-if="data && !error">
      <section v-if="data.responses.length" class="content-section">
        <component :is="embedded ? 'h3' : 'h2'">{{ a('applications') }}</component>
        <ul>
          <li v-for="response in data.responses" :key="response.id">
            <PortalLink :to="`/organizations/${id}/responses/${response.id}`"
              >{{ localized(response) }} — {{ c(response.status) }}</PortalLink
            >
          </li>
        </ul>
      </section>
      <p class="lead">{{ g('fundingIntro') }}</p>
      <p>{{ g('fundingScope') }}</p>
      <p v-if="!data.calls.length">{{ g('noFunding') }}</p>
      <section v-for="call in data.calls" :key="call.id" class="content-section">
        <p class="eyebrow">
          {{ localized({ nameEn: call.agencyNameEn, nameFr: call.agencyNameFr }) }}
        </p>
        <component :is="embedded ? 'h3' : 'h2'">{{ localized(call) }}</component>
        <PortalLink v-if="call.surveyId" :to="`/forms/${id}/${call.id}`">{{ s('view') }}</PortalLink>
        <PortalButton
          v-if="
            call.surveyId &&
            status(call) === 'open' &&
            hasAccess(data.organization.permissions, 'application', 'contributor')
          "
          :disabled="busy"
          @click="start(call.id)"
          >{{ a('start') }}</PortalButton
        >
        <PortalBadge :tone="status(call) === 'open' ? 'success' : 'neutral'">{{
          g(status(call))
        }}</PortalBadge>
        <dl class="detail-list">
          <div>
            <dt>{{ g('program') }}</dt>
            <dd>{{ localized({ nameEn: call.programNameEn, nameFr: call.programNameFr }) }}</dd>
          </div>
          <div>
            <dt>{{ g('stream') }}</dt>
            <dd>{{ localized({ nameEn: call.streamNameEn, nameFr: call.streamNameFr }) }}</dd>
          </div>
          <div>
            <dt>{{ g('startDate') }}</dt>
            <dd>{{ call.startDate }}</dd>
          </div>
          <div>
            <dt>{{ g('endDate') }}</dt>
            <dd>{{ call.endDate }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </section>
</template>

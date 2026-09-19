<script setup lang="ts">
import { hasAccess } from '~~/shared/utils/permissions'
import type { ResponseResult } from '~~/shared/types/cases'
import type { FundingCall } from '~~/shared/types/government'
import type { Organization } from '~~/shared/types/api'
definePageMeta({ key: (route) => String(route.params.organizationId) })
const id = String(useRoute().params.organizationId)
const { g, localized } = useGovernmentLocale()
const { t } = useLocale()
const { s } = useSurveyLocale()
const { a } = useAttachmentLocale(),
  { c } = useCaseLocale(),
  { locale } = useLocale()
const { busy, error: actionError, perform } = useCaseAction()
const api = usePortalApi(),
  message = useApiMessage()
const { data, error, refresh } = await useAsyncData(`funding-${id}`, async () => {
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
useHead(() => ({ title: g('apply') }))
</script>
<template>
  <section>
    <ThemeLink :to="`/organizations/${id}`">{{ data?.organization.name || g('back') }}</ThemeLink>
    <h1>{{ g('apply') }}</h1>
    <ThemeNotice v-if="error" variant="error"
      >{{ message(error) }}
      <ThemeButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</ThemeButton></ThemeNotice
    >
    <ThemeNotice v-if="actionError" variant="error">{{ actionError }}</ThemeNotice>
    <template v-if="data && !error">
      <section v-if="data.responses.length" class="content-section">
        <h2>{{ a('applications') }}</h2>
        <ul>
          <li v-for="response in data.responses" :key="response.id">
            <ThemeLink :to="`/organizations/${id}/responses/${response.id}`"
              >{{ localized(response) }} — {{ c(response.status) }}</ThemeLink
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
        <h2>{{ localized(call) }}</h2>
        <ThemeLink v-if="call.surveyId" :to="`/forms/${id}/${call.id}`">{{ s('view') }}</ThemeLink>
        <ThemeButton
          v-if="
            call.surveyId &&
            status(call) === 'open' &&
            hasAccess(data.organization.permissions, 'application', 'contributor')
          "
          :disabled="busy"
          @click="start(call.id)"
          >{{ a('start') }}</ThemeButton
        >
        <ThemeBadge :tone="status(call) === 'open' ? 'success' : 'neutral'">{{
          g(status(call))
        }}</ThemeBadge>
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

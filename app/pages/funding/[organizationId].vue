<script setup lang="ts">
import type { FundingCall } from '~~/shared/types/government'
import type { Organization } from '~~/shared/types/api'
definePageMeta({ key: (route) => String(route.params.organizationId) })
const id = String(useRoute().params.organizationId)
const { g, localized } = useGovernmentLocale()
const { t } = useLocale()
const { s } = useSurveyLocale()
const api = usePortalApi(),
  message = useApiMessage()
const { data, error, refresh } = await useAsyncData(`funding-${id}`, async () => {
  const funding = await api<{ calls: FundingCall[] }>(`/api/organizations/${id}/funding-calls`)
  const { organization } = await api<{ organization: Organization }>(`/api/organizations/${id}`)
  return { ...funding, organization }
})
const status = (call: FundingCall) => {
  const today = new Date().toISOString().slice(0, 10)
  return today < call.startDate ? 'upcoming' : today > call.endDate ? 'closed' : 'open'
}
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
    <template v-else-if="data">
      <p class="lead">{{ g('fundingIntro') }}</p>
      <p>{{ g('fundingScope') }}</p>
      <p v-if="!data.calls.length">{{ g('noFunding') }}</p>
      <section v-for="call in data.calls" :key="call.id" class="content-section">
        <p class="eyebrow">
          {{ localized({ nameEn: call.agencyNameEn, nameFr: call.agencyNameFr }) }}
        </p>
        <h2>{{ localized(call) }}</h2>
        <ThemeLink v-if="call.surveyId" :to="`/forms/${id}/${call.id}`">{{ s('view') }}</ThemeLink>
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

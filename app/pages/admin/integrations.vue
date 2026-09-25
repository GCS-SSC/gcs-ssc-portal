<script setup lang="ts">
import type { Agency, IntegrationToken } from '~~/shared/types/government'
const { g, localized } = useGovernmentLocale()
const { date, t } = useLocale()
const api = usePortalApi(),
  message = useApiMessage()
const { busy, error, success, perform } = useGovernmentAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData('government-integrations', async () => {
  const [tokens, agencies] = await Promise.all([
    api<IntegrationToken[]>('/api/admin/integration-tokens'),
    api<{ agencies: Agency[] }>('/api/admin/agencies')
  ])
  return { tokens, agencies: agencies.agencies }
})
const name = ref(''),
  agencyId = ref(''),
  days = ref('90'),
  secret = ref('')
const confirmation = ref<IntegrationToken | null>(null)
const options = computed(() => [
  { value: '', label: g('select') },
  ...(data.value?.agencies ?? []).map((a) => ({ value: a.id, label: localized(a) }))
])
const create = () =>
  perform(async () => {
    const result = await api<{ token: string }>('/api/admin/integration-tokens', {
      method: 'POST',
      body: { name: name.value, agencyId: agencyId.value, expiresInDays: Number(days.value) }
    })
    secret.value = result.token
    name.value = ''
    await refresh()
  })
const revoke = (token: IntegrationToken) =>
  perform(async () => {
    await api(`/api/admin/integration-tokens/${token.id}`, { method: 'DELETE' })
    confirmation.value = null
    secret.value = ''
    await refresh()
  })
useHead(() => ({ title: g('integrations') }))
</script>
<template>
  <section>
    <PortalHeading tag="h1">{{ g('integrations') }}</PortalHeading>
    <PortalText>{{ g('integrationIntro') }}</PortalText>
    <PortalNotice v-if="loadError" variant="error"
      >{{ message(loadError) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    ><PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice
    ><PortalNotice v-if="success" variant="success">{{ success }}</PortalNotice>
    <section v-if="confirmation" class="confirmation" aria-live="polite">
      <PortalHeading tag="h2">{{ g('confirmChange') }}</PortalHeading>
      <PortalText>{{ g('revokeConfirm') }} {{ confirmation.name }}</PortalText>
      <div class="form-actions">
        <PortalButton :disabled="busy" @click="revoke(confirmation)">{{
          g('confirm')
        }}</PortalButton
        ><PortalButton variant="secondary" :disabled="busy" @click="confirmation = null">{{
          g('cancel')
        }}</PortalButton>
      </div>
    </section>
    <template v-if="data">
      <PortalText v-if="!data.tokens.length">{{ g('noTokens') }}</PortalText>
      <div v-else class="table-scroll">
        <PortalTable
          :label="g('integrations')"
          :rows="data.tokens"
          :columns="[
            { field: 'name', header: g('tokenName') },
            { field: 'agency', header: g('agency') },
            { field: 'expires', header: g('expires') },
            { field: 'status', header: g('status') }
          ]"
        >
          <template #name="{ row: token }">{{ token.name }}</template>
          <template #agency="{ row: token }">{{
            localized(data.agencies.find((a) => a.id === token.agencyId)!)
          }}</template>
          <template #expires="{ row: token }">{{ date(token.expiresAt) }}</template>
          <template #status="{ row: token }">
            <span v-if="token.revoked">{{ g('revoked') }}</span
            ><span v-else-if="new Date(token.expiresAt).getTime() <= Date.now()">{{
              g('expired')
            }}</span
            ><PortalButton
              v-else
              variant="secondary"
              :disabled="busy"
              @click="confirmation = token"
              >{{ g('revoke') }}</PortalButton
            >
          </template>
        </PortalTable>
      </div>
      <section class="content-section">
        <PortalHeading tag="h2">{{ g('issueToken') }}</PortalHeading>
        <PortalText v-if="!data.agencies.length">{{ g('noAgencies') }}</PortalText>
        <form v-else class="portal-form" @submit.prevent="create">
          <PortalInput
            id="token-name"
            v-model="name"
            :label="g('tokenName')"
            :maxlength="120"
            required
          /><PortalSelect
            id="token-agency"
            v-model="agencyId"
            :label="g('agency')"
            :options="options"
            required
          /><PortalInput
            id="token-days"
            v-model="days"
            :label="g('tokenDays')"
            hint="1–365"
            :maxlength="3"
            required
          />
          <div class="form-actions">
            <PortalButton type="submit" :disabled="busy" :loading="busy">{{
              g('issueToken')
            }}</PortalButton>
          </div>
        </form>
        <section v-if="secret" class="invitation-result" aria-live="polite">
          <PortalText>{{ g('tokenHint') }}</PortalText>
          <PortalInput id="integration-secret" :model-value="secret" :label="g('token')" readonly />
        </section>
      </section>
    </template>
  </section>
</template>

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
    <PortalLink to="/admin">{{ g('back') }}</PortalLink>
    <h1>{{ g('integrations') }}</h1>
    <p class="lead">{{ g('integrationIntro') }}</p>
    <PortalNotice v-if="loadError" variant="error"
      >{{ message(loadError) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    ><PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice
    ><PortalNotice v-if="success" variant="success">{{ success }}</PortalNotice>
    <section v-if="confirmation" class="confirmation" aria-live="polite">
      <h2>{{ g('confirmChange') }}</h2>
      <p>{{ g('revokeConfirm') }} {{ confirmation.name }}</p>
      <div class="form-actions">
        <PortalButton :disabled="busy" @click="revoke(confirmation)">{{ g('confirm') }}</PortalButton
        ><PortalButton variant="secondary" :disabled="busy" @click="confirmation = null">{{
          g('cancel')
        }}</PortalButton>
      </div>
    </section>
    <template v-if="data">
      <p v-if="!data.tokens.length">{{ g('noTokens') }}</p>
      <div v-else class="table-scroll">
        <table>
          <caption class="sr-only">
            {{
              g('integrations')
            }}
          </caption>
          <thead>
            <tr>
              <th scope="col">{{ g('tokenName') }}</th>
              <th scope="col">{{ g('agency') }}</th>
              <th scope="col">{{ g('expires') }}</th>
              <th scope="col">{{ g('status') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="token in data.tokens" :key="token.id">
              <td>{{ token.name }}</td>
              <td>{{ localized(data.agencies.find((a) => a.id === token.agencyId)!) }}</td>
              <td>{{ date(token.expiresAt) }}</td>
              <td>
                <span v-if="token.revoked">{{ g('revoked') }}</span
                ><span v-else-if="new Date(token.expiresAt).getTime() <= Date.now()">{{
                  g('expired')
                }}</span
                ><PortalButton
                  v-else
                  variant="link"
                  :disabled="busy"
                  @click="confirmation = token"
                  >{{ g('revoke') }}</PortalButton
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <section class="content-section">
        <h2>{{ g('issueToken') }}</h2>
        <p v-if="!data.agencies.length">{{ g('noAgencies') }}</p>
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
          <p>{{ g('tokenHint') }}</p>
          <PortalInput id="integration-secret" :model-value="secret" :label="g('token')" readonly />
        </section>
      </section>
    </template>
  </section>
</template>

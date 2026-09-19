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
    api<IntegrationToken[]>('/api/government/integration-tokens'),
    api<{ agencies: Agency[] }>('/api/government/agencies')
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
    const result = await api<{ token: string }>('/api/government/integration-tokens', {
      method: 'POST',
      body: { name: name.value, agencyId: agencyId.value, expiresInDays: Number(days.value) }
    })
    secret.value = result.token
    name.value = ''
    await refresh()
  })
const revoke = (token: IntegrationToken) =>
  perform(async () => {
    await api(`/api/government/integration-tokens/${token.id}`, { method: 'DELETE' })
    confirmation.value = null
    secret.value = ''
    await refresh()
  })
useHead(() => ({ title: g('integrations') }))
</script>
<template>
  <section>
    <ThemeLink to="/government">{{ g('back') }}</ThemeLink>
    <h1>{{ g('integrations') }}</h1>
    <p class="lead">{{ g('integrationIntro') }}</p>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ message(loadError) }}
      <ThemeButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</ThemeButton></ThemeNotice
    ><ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice
    ><ThemeNotice v-if="success" variant="success">{{ success }}</ThemeNotice>
    <section v-if="confirmation" class="confirmation" aria-live="polite">
      <h2>{{ g('confirmChange') }}</h2>
      <p>{{ g('revokeConfirm') }} {{ confirmation.name }}</p>
      <div class="form-actions">
        <ThemeButton :disabled="busy" @click="revoke(confirmation)">{{ g('confirm') }}</ThemeButton
        ><ThemeButton variant="secondary" :disabled="busy" @click="confirmation = null">{{
          g('cancel')
        }}</ThemeButton>
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
                ><ThemeButton
                  v-else
                  variant="link"
                  :disabled="busy"
                  @click="confirmation = token"
                  >{{ g('revoke') }}</ThemeButton
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
          <ThemeInput
            id="token-name"
            v-model="name"
            :label="g('tokenName')"
            :maxlength="120"
            required
          /><ThemeSelect
            id="token-agency"
            v-model="agencyId"
            :label="g('agency')"
            :options="options"
            required
          /><ThemeInput
            id="token-days"
            v-model="days"
            :label="g('tokenDays')"
            hint="1–365"
            :maxlength="3"
            required
          />
          <div class="form-actions">
            <ThemeButton type="submit" :disabled="busy" :loading="busy">{{
              g('issueToken')
            }}</ThemeButton>
          </div>
        </form>
        <section v-if="secret" class="invitation-result" aria-live="polite">
          <p>{{ g('tokenHint') }}</p>
          <ThemeInput id="integration-secret" :model-value="secret" :label="g('token')" readonly />
        </section>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { Agency, IntegrationToken } from '~~/shared/types/government'

definePageMeta({ key: (route) => route.params.id as string })
const route = useRoute()
const id = String(route.params.id)
const { g, localized } = useGovernmentLocale()
const { date, t } = useLocale()
const api = usePortalApi()
const message = useApiMessage()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData(`government-integrations-${id}`, async () => {
  const [tokens, agencies] = await Promise.all([
    api<IntegrationToken[]>('/api/admin/integration-tokens'),
    api<{ agencies: Agency[] }>('/api/admin/agencies')
  ])
  return { tokens, agencies: agencies.agencies }
})
const agency = computed(() => data.value?.agencies.find((item) => item.id === id))
const agencyTokens = computed(
  () => data.value?.tokens.filter((token) => token.agencyId === id) ?? []
)
const formOpen = ref(false)
const name = ref('')
const days = ref('')
const daysError = ref('')
const busy = ref(false)
const error = ref('')
const status = ref('')
const confirmation = ref<{ token: IntegrationToken; action: 'revoke' | 'replace' } | null>(null)
const issued = ref<{ id: string; token: string; kind: 'created' | 'replaced' } | null>(null)
const issuedSection = ref<HTMLElement | null>(null)
const secretVisible = ref(false)
const copied = ref(false)

const openForm = () => {
  confirmation.value = null
  daysError.value = ''
  formOpen.value = true
}
const closeForm = () => {
  formOpen.value = false
  daysError.value = ''
  name.value = ''
  days.value = ''
}
const confirmAction = (token: IntegrationToken, action: 'revoke' | 'replace') => {
  closeForm()
  confirmation.value = { token, action }
}

const perform = async (action: () => Promise<void>) => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  status.value = ''
  try {
    await action()
  } catch (failure) {
    error.value = message(failure)
  } finally {
    busy.value = false
  }
}
const focusIssued = async () => {
  await nextTick()
  issuedSection.value?.focus()
}
const create = () => {
  const value = days.value.trim()
  const parsedDays = Number(value)
  if (
    value &&
    (!/^\d+$/.test(value) || !Number.isInteger(parsedDays) || parsedDays < 1 || parsedDays > 365)
  ) {
    daysError.value = g('tokenDaysError')
    return
  }
  daysError.value = ''
  const expiresInDays = value ? parsedDays : null
  return perform(async () => {
    const result = await api<{ id: string; token: string }>('/api/admin/integration-tokens', {
      method: 'POST',
      body: { name: name.value, agencyId: id, expiresInDays }
    })
    issued.value = { ...result, kind: 'created' }
    secretVisible.value = false
    copied.value = false
    formOpen.value = false
    name.value = ''
    days.value = ''
    await refresh()
    await focusIssued()
  })
}
const replace = (token: IntegrationToken) =>
  perform(async () => {
    const result = await api<{ token: string }>(
      `/api/admin/integration-tokens/${token.id}/replace`,
      { method: 'POST' }
    )
    confirmation.value = null
    issued.value = { id: token.id, token: result.token, kind: 'replaced' }
    secretVisible.value = false
    copied.value = false
    await focusIssued()
  })
const revoke = (token: IntegrationToken) =>
  perform(async () => {
    await api(`/api/admin/integration-tokens/${token.id}`, { method: 'DELETE' })
    confirmation.value = null
    if (issued.value?.id === token.id) issued.value = null
    status.value = g('credentialRevoked')
    await refresh()
  })
const copy = async () => {
  if (!issued.value) return
  try {
    await navigator.clipboard.writeText(issued.value.token)
    copied.value = true
  } catch {
    document.getElementById('integration-secret')?.focus()
  }
}
useHead(() => ({ title: agency.value ? localized(agency.value) : g('agencies') }))
</script>

<template>
  <section>
    <PortalHeading tag="h1">{{ agency ? localized(agency) : g('agencies') }}</PortalHeading>
    <PortalText v-if="agency">
      {{ g('agencyId') }}: <span class="identifier">{{ agency.id }}</span>
    </PortalText>
    <PortalNotice v-if="loadError" variant="error">
      {{ message(loadError) }}
      <PortalButton variant="secondary" @click="refresh()">{{ t('retry') }}</PortalButton>
    </PortalNotice>
    <PortalNotice v-else-if="data && !agency" variant="error">{{
      g('agencyNotFound')
    }}</PortalNotice>

    <section v-if="agency" :aria-label="g('integrations')">
      <div class="page-heading">
        <div>
          <PortalHeading tag="h2">{{ g('integrations') }}</PortalHeading>
          <PortalText>{{ g('integrationIntro') }}</PortalText>
        </div>
        <PortalButton v-if="!formOpen" @click="openForm">{{ g('issueToken') }}</PortalButton>
      </div>

      <PortalNotice v-if="error" variant="error" title-tag="h3">{{ error }}</PortalNotice>
      <PortalNotice v-if="status" variant="success" title-tag="h3">{{ status }}</PortalNotice>

      <section v-if="formOpen" class="credential-workflow" :aria-label="g('issueToken')">
        <PortalHeading tag="h3">{{ g('issueToken') }}</PortalHeading>
        <form class="portal-form" @submit.prevent="create">
          <PortalInput
            id="token-name"
            v-model="name"
            :label="g('tokenName')"
            :maxlength="120"
            required
          />
          <PortalInput
            id="token-days"
            v-model="days"
            :label="g('tokenDays')"
            :hint="g('tokenDaysHint')"
            :error="daysError"
            :maxlength="3"
          />
          <div class="form-actions">
            <PortalButton type="submit" :disabled="busy" :loading="busy">{{
              g('issueToken')
            }}</PortalButton>
            <PortalButton variant="secondary" :disabled="busy" @click="closeForm">{{
              g('cancel')
            }}</PortalButton>
          </div>
        </form>
      </section>

      <section v-if="confirmation" class="credential-workflow" :aria-label="g('confirmChange')">
        <PortalHeading tag="h3">{{ g('confirmChange') }}</PortalHeading>
        <PortalText>
          {{ g(confirmation.action === 'replace' ? 'replaceConfirm' : 'revokeConfirm') }}
          {{ confirmation.token.name }}
        </PortalText>
        <div class="form-actions">
          <PortalButton
            :disabled="busy"
            @click="
              confirmation.action === 'replace'
                ? replace(confirmation.token)
                : revoke(confirmation.token)
            "
            >{{ g('confirm') }}</PortalButton
          >
          <PortalButton variant="secondary" :disabled="busy" @click="confirmation = null">{{
            g('cancel')
          }}</PortalButton>
        </div>
      </section>

      <section v-if="issued" ref="issuedSection" class="credential-workflow" tabindex="-1">
        <PortalNotice
          variant="success"
          title-tag="h3"
          :title="g(issued.kind === 'created' ? 'credentialCreated' : 'credentialReplaced')"
          >{{ g('tokenHint') }}</PortalNotice
        >
        <PortalInput
          id="integration-secret"
          :key="secretVisible ? 'visible' : 'hidden'"
          :model-value="issued.token"
          :label="g('token')"
          :type="secretVisible ? 'text' : 'password'"
          readonly
        />
        <div class="form-actions">
          <PortalButton variant="secondary" @click="secretVisible = !secretVisible">{{
            g(secretVisible ? 'hideToken' : 'viewToken')
          }}</PortalButton>
          <PortalButton variant="secondary" @click="copy">{{
            copied ? t('copied') : g('copyToken')
          }}</PortalButton>
          <PortalButton variant="secondary" @click="issued = null">{{ t('dismiss') }}</PortalButton>
        </div>
      </section>

      <PortalText v-if="!agencyTokens.length">{{ g('noTokens') }}</PortalText>
      <div v-else class="table-scroll">
        <PortalTable
          :label="g('integrations')"
          :rows="agencyTokens"
          :columns="[
            { field: 'name', header: g('tokenName') },
            { field: 'expires', header: g('expires') },
            { field: 'status', header: g('status') },
            { field: 'actions', header: t('actions') }
          ]"
        >
          <template #name="{ row: token }">{{ token.name }}</template>
          <template #expires="{ row: token }">{{
            token.expiresAt ? date(token.expiresAt) : g('neverExpires')
          }}</template>
          <template #status="{ row: token }">
            {{
              token.revoked
                ? g('revoked')
                : token.expiresAt && new Date(token.expiresAt).getTime() <= Date.now()
                  ? g('expired')
                  : t('active')
            }}
          </template>
          <template #actions="{ row: token }">
            <span
              v-if="
                !token.revoked &&
                (!token.expiresAt || new Date(token.expiresAt).getTime() > Date.now())
              "
              class="form-actions"
            >
              <PortalButton
                size="small"
                variant="secondary"
                :disabled="busy"
                @click="confirmAction(token, 'replace')"
                >{{ g('replaceToken') }}
                <PortalScreenreaderOnly>{{ token.name }}</PortalScreenreaderOnly></PortalButton
              >
              <PortalButton
                size="small"
                variant="secondary"
                :disabled="busy"
                @click="confirmAction(token, 'revoke')"
                >{{ g('revoke') }}
                <PortalScreenreaderOnly>{{ token.name }}</PortalScreenreaderOnly></PortalButton
              >
            </span>
          </template>
        </PortalTable>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import type { AuditEvidence, AccessEvidence, EvidenceList } from '~~/shared/types/evidence'
const route = useRoute()
const { g } = useGovernmentLocale()
const { locale, t } = useLocale()
const api = usePortalApi()
const message = useApiMessage()
const kind = computed(() => (route.query.kind === 'access' ? 'access' : 'audit'))
const page = computed(() => {
  const parsed = Number(route.query.page)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1
})
const endpoint = computed(
  () => `/api/admin/${kind.value === 'audit' ? 'audit-events' : 'access-events'}?page=${page.value}`
)
const { data, pending, error, refresh } = await useAsyncData(
  'admin-evidence',
  () => api<EvidenceList<AuditEvidence | AccessEvidence>>(endpoint.value),
  { watch: [endpoint] }
)
const timestamp = (value: string) =>
  new Intl.DateTimeFormat(locale.value === 'fr' ? 'fr-CA' : 'en-CA', {
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(new Date(value))
const actor = (row: AuditEvidence | AccessEvidence) => {
  const names: Record<string, string> = {
    administrator: g('administratorActor'),
    organization: g('organizationActor'),
    integration: g('integrationActor')
  }
  return row.actorKind === 'anonymous'
    ? g('anonymous')
    : `${names[row.actorKind] ?? row.actorKind} #${row.actorId}`
}
const totalPages = computed(() =>
  Math.max(1, Math.ceil((data.value?.total ?? 0) / (data.value?.limit ?? 25)))
)
useHead(() => ({ title: g('evidence') }))
</script>
<template>
  <section>
    <PortalHeading tag="h1">{{ g('evidence') }}</PortalHeading>
    <PortalText>{{ g('evidenceIntro') }}</PortalText>
    <nav class="form-actions" :aria-label="g('evidence')">
      <PortalLink to="/admin/evidence?kind=audit">{{ g('auditEvents') }}</PortalLink>
      <PortalLink to="/admin/evidence?kind=access">{{ g('accessEvents') }}</PortalLink>
    </nav>
    <PortalHeading tag="h2">{{
      kind === 'audit' ? g('auditEvents') : g('accessEvents')
    }}</PortalHeading>
    <PortalNotice v-if="error" variant="error">
      {{ message(error) }}
      <PortalButton variant="secondary" @click="refresh()">{{ t('retry') }}</PortalButton>
    </PortalNotice>
    <PortalText v-else-if="pending">{{ g('loadingEvidence') }}</PortalText>
    <PortalText v-else-if="!data?.items.length">{{ g('noEvidence') }}</PortalText>
    <template v-else>
      <div class="table-scroll">
        <PortalTable
          :label="kind === 'audit' ? g('auditEvents') : g('accessEvents')"
          :rows="data.items"
          :columns="
            kind === 'audit'
              ? [
                  { field: 'when', header: g('when') },
                  { field: 'who', header: g('actor') },
                  { field: 'operation', header: g('operation') },
                  { field: 'resource', header: g('resource') },
                  { field: 'request', header: g('requestId') }
                ]
              : [
                  { field: 'when', header: g('when') },
                  { field: 'who', header: g('actor') },
                  { field: 'operation', header: g('operation') },
                  { field: 'resource', header: g('resource') },
                  { field: 'status', header: g('status') },
                  { field: 'duration', header: g('duration') },
                  { field: 'request', header: g('requestId') }
                ]
          "
        >
          <template #when="{ row }">{{ timestamp(row.createdAt) }}</template>
          <template #who="{ row }">{{ actor(row) }}</template>
          <template #operation="{ row }">{{
            'method' in row ? row.method : row.operation
          }}</template>
          <template #resource="{ row }">{{ row.path }}</template>
          <template #status="{ row }">{{ 'status' in row ? row.status : '' }}</template>
          <template #duration="{ row }">{{
            'durationMs' in row ? `${row.durationMs} ms` : ''
          }}</template>
          <template #request="{ row }"
            ><code>{{ row.requestId }}</code></template
          >
        </PortalTable>
      </div>
      <PortalPagination
        v-if="totalPages > 1"
        :label="g('evidencePages')"
        :page="page"
        :total-pages="totalPages"
        :kind="kind"
      />
    </template>
  </section>
</template>

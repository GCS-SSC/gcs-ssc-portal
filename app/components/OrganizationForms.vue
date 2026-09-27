<script setup lang="ts">
import type { ResponseSummary, SubmissionSet } from '~~/shared/types/agreements'

const props = defineProps<{ organizationId: string }>()
const base = `/api/organizations/${props.organizationId}`
const api = usePortalApi()
const { c, errorMessage } = useAgreementLocale()
const { localized } = useGovernmentLocale()
const { locale, t, date } = useLocale()
const {
  data,
  error: loadError,
  refresh,
  status
} = useAsyncData(`organization-forms-${props.organizationId}`, async () => {
  const [setResult, responseResult] = await Promise.all([
    api<{ sets: SubmissionSet[] }>(`${base}/sets`),
    api<{ responses: ResponseSummary[] }>(`${base}/responses`)
  ])
  return {
    sets: setResult.sets.filter((set) => !set.agreementId),
    responses: responseResult.responses.filter(
      (response) =>
        !response.agreementId &&
        !response.callId &&
        response.kinds.every((kind) => kind === 'survey')
    )
  }
})
</script>

<template>
  <section :aria-label="c('formsNav')">
    <PortalHeading tag="h2" margin-top="0">{{ c('formsNav') }}</PortalHeading>
    <PortalText v-if="status === 'pending'" role="status">{{ t('loading') }}</PortalText>
    <PortalNotice v-if="loadError" variant="error">
      {{ errorMessage(loadError) }}
      <PortalButton @click="refresh()">{{ c('reload') }}</PortalButton>
    </PortalNotice>
    <template v-else-if="data">
      <PortalText v-if="!data.sets.length && !data.responses.length">{{ c('empty') }}</PortalText>
      <PortalHeading v-if="data.sets.length" tag="h3">{{ c('availableForms') }}</PortalHeading>
      <ul v-if="data.sets.length" class="organization-list">
        <li v-for="set in data.sets" :key="set.id">
          <PortalLink :to="`/organizations/${organizationId}/sets/${set.id}`">{{
            localized(set)
          }}</PortalLink>
        </li>
      </ul>
      <div v-if="data.responses.length" class="table-scroll">
        <PortalTable
          :label="c('formResponses')"
          :rows="data.responses"
          :columns="[
            { field: 'form', header: c('formName') },
            { field: 'status', header: c('gcsStatus') },
            { field: 'updated', header: c('updated') }
          ]"
        >
          <template #form="{ row: response }">
            <PortalLink :to="`/organizations/${organizationId}/responses/${response.id}`">{{
              localized(response)
            }}</PortalLink>
            <span class="table-secondary">{{ response.codes.other ?? response.id }}</span>
          </template>
          <template #status="{ row: response }">
            <PortalBadge>{{ c(response.status) }}</PortalBadge>
            <PortalBadge v-if="response.gcsStatus" :colour="response.gcsStatus.colour">{{
              response.gcsStatus[locale]
            }}</PortalBadge>
          </template>
          <template #updated="{ row: response }">{{ date(response.updatedAt) }}</template>
        </PortalTable>
      </div>
    </template>
  </section>
</template>

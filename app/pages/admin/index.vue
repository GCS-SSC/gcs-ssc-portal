<script setup lang="ts">
import type { Agency } from '~~/shared/types/government'

const { g, localized } = useGovernmentLocale()
const { t } = useLocale()
const api = usePortalApi()
const message = useApiMessage()
const { data, status, error, refresh } = await useFetch<{ agencies: Agency[] }>(
  '/api/admin/agencies',
  { $fetch: api }
)
useHead(() => ({ title: g('agencies') }))
</script>

<template>
  <section>
    <div class="page-heading">
      <div>
        <PortalHeading tag="h1">{{ g('agencies') }}</PortalHeading>
        <PortalText>{{ g('adminAgencyIntro') }}</PortalText>
      </div>
      <PortalLink variant="button" to="/admin/new"
        >{{ g('newAgency') }} <span aria-hidden="true">+</span></PortalLink
      >
    </div>
    <PortalText v-if="status === 'pending'" role="status">{{ t('loading') }}</PortalText>
    <PortalNotice v-else-if="error" variant="error"
      >{{ message(error) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    >
    <div v-else-if="!data?.agencies.length" class="empty-state">
      <PortalHeading tag="h2">{{ g('noAgencies') }}</PortalHeading>
      <PortalLink to="/admin/new">{{ g('newAgency') }}</PortalLink>
    </div>
    <ul v-else class="record-summary-list">
      <RecordSummary v-for="agency in data.agencies" :key="agency.id" as="li" heading-tag="h2">
        <template #title>{{ localized(agency) }}</template>
        <template #details>
          <PortalText size="small" text-role="secondary" margin-bottom="100">
            {{ g('agencyId') }}: <span class="identifier">{{ agency.id }}</span>
          </PortalText>
        </template>
        <template #cta>
          <PortalLink
            variant="button"
            size="small"
            button-role="secondary"
            :to="`/admin/agencies/${agency.id}`"
            :aria-label="`${g('openAgency')}: ${localized(agency)}`"
            >{{ g('openAgency') }}</PortalLink
          >
        </template>
      </RecordSummary>
    </ul>
  </section>
</template>

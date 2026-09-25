<script setup lang="ts">
import type { Organization } from '~~/shared/types/api'
const { t } = useLocale()
const message = useApiMessage()
const api = usePortalApi()
const { data, status, error, refresh } = await useFetch<{
  organizations: Organization[]
}>('/api/organizations', { $fetch: api })
useHead(() => ({ title: t('organizations') }))
</script>
<template>
  <section>
    <div class="page-heading">
      <div>
        <PortalHeading tag="h1">{{ t('organizations') }}</PortalHeading>
        <PortalText>{{ t('organizationIntro') }}</PortalText>
      </div>
      <PortalLink variant="button" to="/organizations/new"
        >{{ t('createOrg') }} <span aria-hidden="true">+</span></PortalLink
      >
    </div>
    <PortalText v-if="status === 'pending'" role="status">{{ t('loading') }}</PortalText>
    <PortalNotice v-else-if="error" variant="error"
      >{{ message(error) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    >
    <div v-else-if="!data?.organizations.length" class="empty-state">
      <PortalHeading tag="h2">{{ t('noOrganizations') }}</PortalHeading>
      <PortalText>{{ t('noOrganizationsText') }}</PortalText>
      <PortalLink to="/organizations/new">{{ t('createOrg') }}</PortalLink>
    </div>
    <div v-else>
      <ul class="record-summary-list">
        <RecordSummary
          v-for="organization in data.organizations"
          :key="organization.id"
          as="li"
          heading-tag="h2"
        >
          <template #title>{{ organization.name }}</template>
          <template #details>
            <PortalText
              v-if="organization.description"
              size="small"
              text-role="secondary"
              margin-bottom="100"
              >{{ organization.description }}</PortalText
            >
            <PortalText size="small" text-role="secondary" margin-bottom="100">
              {{ organization.memberCount }}
              {{ organization.memberCount === 1 ? t('onePerson') : t('people') }}
            </PortalText>
          </template>
          <template #cta>
            <PortalLink
              variant="button"
              size="small"
              button-role="secondary"
              :to="`/organizations/${organization.id}`"
              :aria-label="`${t('openOrganization')}: ${organization.name}`"
              >{{ t('openOrganization') }}</PortalLink
            >
          </template>
        </RecordSummary>
      </ul>
    </div>
  </section>
</template>

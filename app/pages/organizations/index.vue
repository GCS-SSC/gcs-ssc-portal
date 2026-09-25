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
    <ul v-else class="organization-list">
      <li v-for="organization in data.organizations" :key="organization.id">
        <div>
          <PortalHeading tag="h2">{{ organization.name }}</PortalHeading>
          <PortalText v-if="organization.description">{{ organization.description }}</PortalText>
          <PortalText class="metadata">
            {{ organization.memberCount }}
            {{ organization.memberCount === 1 ? t('onePerson') : t('people') }}
          </PortalText>
        </div>
        <div class="organization-action">
          <PortalLink
            :to="`/organizations/${organization.id}`"
            :aria-label="`${t('openOrganization')}: ${organization.name}`"
            >{{ t('openOrganization') }} <span aria-hidden="true">→</span></PortalLink
          >
        </div>
      </li>
    </ul>
  </section>
</template>

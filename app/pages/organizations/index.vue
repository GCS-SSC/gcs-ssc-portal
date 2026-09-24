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
        <p class="eyebrow">GCS–SSC</p>
        <h1>{{ t('organizations') }}</h1>
        <p class="lead">{{ t('organizationIntro') }}</p>
      </div>
      <PortalLink class="primary-link" to="/organizations/new"
        >{{ t('createOrg') }} <span aria-hidden="true">+</span></PortalLink
      >
    </div>
    <p v-if="status === 'pending'" role="status">{{ t('loading') }}</p>
    <PortalNotice v-else-if="error" variant="error"
      >{{ message(error) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    >
    <div v-else-if="!data?.organizations.length" class="empty-state">
      <h2>{{ t('noOrganizations') }}</h2>
      <p>{{ t('noOrganizationsText') }}</p>
      <PortalLink to="/organizations/new">{{ t('createOrg') }}</PortalLink>
    </div>
    <ul v-else class="organization-list">
      <li v-for="organization in data.organizations" :key="organization.id">
        <div>
          <h2>{{ organization.name }}</h2>
          <p v-if="organization.description">{{ organization.description }}</p>
          <p class="metadata">
            {{ organization.memberCount }}
            {{ organization.memberCount === 1 ? t('onePerson') : t('people') }}
          </p>
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

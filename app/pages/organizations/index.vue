<script setup lang="ts">
import { hasAccess } from '~~/shared/utils/permissions'
import type { Organization } from '~~/shared/types/api'
const { permissionLabel } = useCaseLocale()
const { t } = useLocale()
const { g } = useGovernmentLocale()
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
      <ThemeLink class="primary-link" to="/organizations/new"
        >{{ t('createOrg') }} <span aria-hidden="true">+</span></ThemeLink
      >
    </div>
    <p v-if="status === 'pending'" role="status">{{ t('loading') }}</p>
    <ThemeNotice v-else-if="error" variant="error"
      >{{ message(error) }}
      <ThemeButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</ThemeButton></ThemeNotice
    >
    <div v-else-if="!data?.organizations.length" class="empty-state">
      <h2>{{ t('noOrganizations') }}</h2>
      <p>{{ t('noOrganizationsText') }}</p>
      <ThemeLink to="/organizations/new">{{ t('createOrg') }}</ThemeLink>
    </div>
    <ul v-else class="organization-list">
      <li v-for="organization in data.organizations" :key="organization.id">
        <div>
          <h2>
            <ThemeLink :to="`/organizations/${organization.id}`">{{ organization.name }}</ThemeLink>
          </h2>
          <p v-if="organization.description">{{ organization.description }}</p>
          <p class="metadata">
            {{ organization.memberCount }}
            {{ organization.memberCount === 1 ? t('onePerson') : t('people') }}
          </p>
        </div>
        <div class="organization-access">
          <ThemeLink
            v-if="hasAccess(organization.permissions, 'application')"
            :to="`/funding/${organization.id}`"
            >{{ g('apply') }}</ThemeLink
          >
          <ThemeBadge v-for="permission in organization.permissions" :key="permission">{{
            permissionLabel(permission)
          }}</ThemeBadge
          ><ThemeLink
            :to="`/organizations/${organization.id}`"
            :aria-label="`${t('openOrganization')}: ${organization.name}`"
            ><span aria-hidden="true">→</span></ThemeLink
          >
        </div>
      </li>
    </ul>
    <aside class="help-strip">
      <h2>{{ t('helpTitle') }}</h2>
      <p>{{ t('helpText') }}</p>
    </aside>
  </section>
</template>

<script setup lang="ts">
import type { Organization } from '~~/shared/types/api'
const { locale, t } = useLocale()
const { user, signOut } = usePortalSession()
const { administrator, signOut: adminSignOut } = useAdministratorSession()
const route = useRoute()
const { g } = useGovernmentLocale()
const { c } = useAgreementLocale()
const requestFetch = useRequestFetch()
const agreementOrganizationId = computed(
  () => /^\/organizations\/([^/]+)\/agreements\/[^/]+$/.exec(route.path)?.[1] ?? null
)
const { data: agreementOrganization } = await useAsyncData(
  'agreement-breadcrumb-organization',
  async () => {
    const id = agreementOrganizationId.value
    if (!id) return null
    try {
      const result = await requestFetch<{ organization: Organization }>(
        `/api/organizations/${encodeURIComponent(id)}`
      )
      return { id, name: result.organization.name }
    } catch {
      return null
    }
  },
  { watch: [agreementOrganizationId] }
)
const inAdmin = computed(() => route.path.startsWith('/admin'))
const navigation = computed(() =>
  inAdmin.value
    ? administrator.value
      ? [
          { to: '/admin', label: g('agencies') },
          { to: '/admin/integrations', label: g('integrations') }
        ]
      : []
    : user.value
      ? [{ to: '/organizations', label: t('organizations') }]
      : []
)
const breadcrumbs = computed(() => {
  if (route.path === '/') return []
  if (inAdmin.value)
    return route.path === '/admin' || route.path === '/admin/login'
      ? []
      : [{ to: '/admin', label: g('adminTitle') }]
  const items = [{ to: '/', label: t('home') }]
  if (
    route.path.startsWith('/organizations/') ||
    route.path.startsWith('/funding/') ||
    route.path.startsWith('/forms/')
  ) {
    items.push({ to: '/organizations', label: t('organizations') })
  }
  const id = agreementOrganizationId.value
  if (id && agreementOrganization.value?.id === id) {
    items.push(
      { to: `/organizations/${id}`, label: agreementOrganization.value.name },
      { to: `/organizations/${id}?section=agreements`, label: c('agreements') }
    )
  }
  return items
})
const message = useApiMessage()
const signOutError = ref('')
useHead(() => ({
  htmlAttrs: { lang: locale.value },
  titleTemplate: (title) => (title ? `${title} | GCS–SSC` : `${t('portal')} | GCS–SSC`)
}))
const logout = async () => {
  try {
    if (inAdmin.value) await adminSignOut()
    else await signOut('/login')
  } catch (error) {
    signOutError.value = message(error)
  }
}
</script>
<template>
  <div class="gc-theme">
    <PortalShell
      :locale="locale"
      :breadcrumbs="breadcrumbs"
      :navigation="navigation"
      :portal-title="inAdmin ? g('adminTitle') : undefined"
      :signed-in="inAdmin ? !!administrator : !!user"
      :user-name="inAdmin ? administrator?.name : user?.name"
      :current-path="route.path"
      @locale="locale = $event"
      @signout="logout"
    >
      <PortalNotice v-if="signOutError" variant="error">{{ signOutError }}</PortalNotice>
      <NuxtPage />
    </PortalShell>
  </div>
</template>

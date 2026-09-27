<script setup lang="ts">
import type { Organization } from '~~/shared/types/api'
import type { OrganizationAgreementSummary, ResponseResult } from '~~/shared/types/agreements'
const { locale, t } = useLocale()
const { user, signOut } = usePortalSession()
const { administrator, signOut: adminSignOut } = useAdministratorSession()
const route = useRoute()
const { g, localized } = useGovernmentLocale()
const { c } = useAgreementLocale()
const requestFetch = useRequestFetch()
const agreementOrganizationId = computed(
  () => /^\/organizations\/([^/]+)\/agreements\/[^/]+$/.exec(route.path)?.[1] ?? null
)
const responseRoute = computed(() =>
  /^\/organizations\/([^/]+)\/responses\/([^/]+)$/.exec(route.path)
)
const breadcrumbOrganizationId = computed(
  () => agreementOrganizationId.value ?? responseRoute.value?.[1] ?? null
)
const breadcrumbResponseId = computed(() => responseRoute.value?.[2] ?? null)
const { data: recordBreadcrumb } = await useAsyncData(
  'record-breadcrumb-context',
  async () => {
    const id = breadcrumbOrganizationId.value
    const responseId = breadcrumbResponseId.value
    if (!id) return null
    try {
      const base = `/api/organizations/${encodeURIComponent(id)}`
      const [organizationResult, responseResult] = await Promise.all([
        requestFetch<{ organization: Organization }>(base),
        responseId
          ? requestFetch<ResponseResult>(`${base}/responses/${encodeURIComponent(responseId)}`)
          : Promise.resolve(null)
      ])
      const reference = responseResult?.response.snapshot.agreementReference
      const agreementId = reference ? String(reference.id) : null
      const agreements = agreementId
        ? await requestFetch<{ agreements: OrganizationAgreementSummary[] }>(`${base}/agreements`)
        : null
      const agreement = agreements?.agreements.find((entry) => entry.id === agreementId)
      return {
        organizationId: id,
        responseId,
        organizationName: organizationResult.organization.name,
        agreementId,
        agreementName: agreement
          ? { nameEn: agreement.nameEn, nameFr: agreement.nameFr }
          : reference
            ? { nameEn: reference.agreementNumber, nameFr: reference.agreementNumber }
            : null
      }
    } catch {
      return null
    }
  },
  { watch: [breadcrumbOrganizationId, breadcrumbResponseId] }
)
const inAdmin = computed(() => route.path.startsWith('/admin'))
const navigation = computed(() =>
  inAdmin.value
    ? administrator.value
      ? [
          { to: '/admin', label: g('agencies') },
          { to: '/admin/evidence', label: g('evidence') }
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
      : [{ to: '/admin', label: g('agencies') }]
  const items = [{ to: '/', label: t('home') }]
  if (
    route.path.startsWith('/organizations/') ||
    route.path.startsWith('/funding/') ||
    route.path.startsWith('/forms/')
  ) {
    items.push({ to: '/organizations', label: t('organizations') })
  }
  const id = breadcrumbOrganizationId.value
  if (id && recordBreadcrumb.value?.organizationId === id) {
    items.push({ to: `/organizations/${id}`, label: recordBreadcrumb.value.organizationName })
    if (agreementOrganizationId.value || recordBreadcrumb.value.agreementId)
      items.push({ to: `/organizations/${id}?section=agreements`, label: c('agreements') })
    if (
      breadcrumbResponseId.value &&
      recordBreadcrumb.value.responseId === breadcrumbResponseId.value &&
      recordBreadcrumb.value.agreementId &&
      recordBreadcrumb.value.agreementName
    )
      items.push({
        to: `/organizations/${id}/agreements/${recordBreadcrumb.value.agreementId}`,
        label: localized(recordBreadcrumb.value.agreementName)
      })
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

<script setup lang="ts">
const { locale, t } = useLocale()
const { user, signOut } = usePortalSession()
const { administrator, signOut: adminSignOut } = useAdministratorSession()
const route = useRoute()
const { g } = useGovernmentLocale()
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

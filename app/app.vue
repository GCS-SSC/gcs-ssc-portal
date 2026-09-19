<script setup lang="ts">
const { locale, t } = useLocale()
const { user, government, signOut } = usePortalSession()
const route = useRoute()
const { g } = useGovernmentLocale()
const inGovernment = computed(() => route.path.startsWith('/government'))
const navigation = computed(() =>
  inGovernment.value
    ? government.value
      ? [
          { to: '/government', label: g('agencies') },
          ...(government.value.role === 'root'
            ? [
                { to: '/government/staff', label: g('staff') },
                { to: '/government/integrations', label: g('integrations') }
              ]
            : [])
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
    await signOut(inGovernment.value ? '/government/login' : '/login')
  } catch (error) {
    signOutError.value = message(error)
  }
}
</script>
<template>
  <ThemeRoot>
    <ThemeShell
      :locale="locale"
      :navigation="navigation"
      :portal-title="inGovernment ? g('government') : undefined"
      :signed-in="!!user"
      :user-name="user?.name"
      :current-path="route.path"
      @locale="locale = $event"
      @signout="logout"
    >
      <ThemeNotice v-if="signOutError" variant="error">{{ signOutError }}</ThemeNotice>
      <NuxtPage />
    </ThemeShell>
  </ThemeRoot>
</template>

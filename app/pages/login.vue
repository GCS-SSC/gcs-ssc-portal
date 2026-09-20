<script setup lang="ts">
const { t } = useLocale()
const { g } = useGovernmentLocale()
const governmentLogin = computed(() => route.path === '/government/login')
const route = useRoute()
const { government, governmentAccount, refresh } = usePortalSession()
const message = useApiMessage()
const email = ref('')
const password = ref('')
const pending = ref(false)
const error = ref('')
const destination = computed(() => {
  const next = route.query.next
  return typeof next === 'string' &&
    /^\/(organizations(?:\/|$)|funding\/|forms\/|government(?:\/|$)|invitations\/)[a-zA-Z0-9_/?=&%-]*$/.test(
      next
    ) &&
    !next.includes('\\')
    ? next
    : governmentLogin.value
      ? '/government'
      : '/organizations'
})
useHead(() => ({ title: t('signIn') }))
const submit = async () => {
  if (pending.value) return
  error.value = ''
  pending.value = true
  try {
    await $fetch('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    await refresh()
    const governmentInvitation = destination.value.startsWith('/government/invitations/')
    if (
      (!governmentLogin.value && governmentAccount.value) ||
      (governmentLogin.value && !government.value && !governmentInvitation)
    ) {
      await $fetch('/api/auth/sign-out', { method: 'POST', body: {} })
      await refresh()
      error.value = governmentLogin.value ? g('accessRequiredText') : t('governmentAccountLogin')
      return
    }
    await navigateTo(destination.value)
  } catch (failure) {
    error.value = message(failure)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <div class="form-page">
    <ThemeLink to="/">{{ t('home') }}</ThemeLink>
    <h1>{{ governmentLogin ? g('governmentLogin') : t('signIn') }}</h1>
    <p class="lead">{{ governmentLogin ? g('governmentLoginIntro') : t('signInIntro') }}</p>
    <form class="portal-form" @submit.prevent="submit">
      <ThemeNotice v-if="error" variant="error" :title="t('errorTitle')">{{ error }}</ThemeNotice>
      <ThemeInput
        id="login-email"
        v-model="email"
        :label="t('email')"
        type="email"
        autocomplete="username"
        required
      />
      <ThemeInput
        id="login-password"
        v-model="password"
        :label="t('password')"
        type="password"
        autocomplete="current-password"
        required
      />
      <div class="form-actions">
        <ThemeButton type="submit" :loading="pending" :disabled="pending">{{
          t('signIn')
        }}</ThemeButton>
      </div>
    </form>
    <p v-if="!governmentLogin" class="form-alternative">
      {{ t('noAccount') }}
      <ThemeLink to="/register">{{ t('register') }}</ThemeLink>
    </p>
  </div>
</template>

<script setup lang="ts">
const { t } = useLocale()
const route = useRoute()
const { governmentAccount, refresh } = usePortalSession()
const message = useApiMessage()
const email = ref(import.meta.dev ? 'owner@portal.com' : '')
const password = ref(import.meta.dev ? 'password123' : '')
const pending = ref(false)
const error = ref('')
const destination = computed(() => {
  const next = route.query.next
  return typeof next === 'string' &&
    /^\/(organizations(?:\/|$)|funding\/|forms\/|invitations\/)[a-zA-Z0-9_/?=&%-]*$/.test(next) &&
    !next.includes('\\')
    ? next
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
    if (governmentAccount.value) {
      await $fetch('/api/auth/sign-out', { method: 'POST', body: {} })
      await refresh()
      error.value = t('governmentAccountLogin')
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
  <PortalContainer size="md">
    <PortalHeading tag="h1">{{ t('signIn') }}</PortalHeading>
    <PortalText>{{ t('signInIntro') }}</PortalText>
    <form class="portal-form" @submit.prevent="submit">
      <PortalNotice v-if="error" variant="error" :title="t('errorTitle')">{{ error }}</PortalNotice>
      <PortalInput
        id="login-email"
        v-model="email"
        :label="t('email')"
        type="email"
        autocomplete="username"
        required
      />
      <PortalInput
        id="login-password"
        v-model="password"
        :label="t('password')"
        type="password"
        autocomplete="current-password"
        required
      />
      <div class="form-actions">
        <PortalButton type="submit" :loading="pending" :disabled="pending">{{
          t('signIn')
        }}</PortalButton>
      </div>
    </form>
    <PortalText class="form-alternative">
      {{ t('noAccount') }}
      <PortalLink to="/register">{{ t('register') }}</PortalLink>
    </PortalText>
  </PortalContainer>
</template>

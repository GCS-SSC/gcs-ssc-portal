<script setup lang="ts">
const { t } = useLocale()
const { g } = useGovernmentLocale()
const { administrator, refresh } = useAdministratorSession()
const message = useApiMessage()
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)
useHead(() => ({ title: t('signIn') }))
const submit = async () => {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { email: email.value, password: password.value }
    })
    await refresh()
    if (administrator.value) await navigateTo('/admin')
  } catch (failure) {
    error.value = message(failure)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <div class="form-page">
    <h1>{{ g('adminLogin') }}</h1>
    <p class="lead">{{ g('adminLoginIntro') }}</p>
    <form class="portal-form" @submit.prevent="submit">
      <PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice>
      <PortalInput
        id="admin-email"
        v-model="email"
        :label="t('email')"
        type="email"
        autocomplete="username"
        required
      />
      <PortalInput
        id="admin-password"
        v-model="password"
        :label="t('password')"
        type="password"
        autocomplete="current-password"
        required
      />
      <PortalButton type="submit" :disabled="pending" :loading="pending">{{
        t('signIn')
      }}</PortalButton>
    </form>
  </div>
</template>

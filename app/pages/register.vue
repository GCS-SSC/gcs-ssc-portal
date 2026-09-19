<script setup lang="ts">
const { t } = useLocale()
const route = useRoute()
const { user, refresh } = usePortalSession()
const message = useApiMessage()
const name = ref('')
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const confirmation = ref('')
const pending = ref(false)
const error = ref('')
const confirmationError = ref('')
const invitationPath = computed(() =>
  typeof route.query.governmentInvitation === 'string' &&
  /^[a-zA-Z0-9_-]+$/.test(route.query.governmentInvitation)
    ? `/government/invitations/${route.query.governmentInvitation}`
    : typeof route.query.invitation === 'string' && /^[a-zA-Z0-9_-]+$/.test(route.query.invitation)
      ? `/invitations/${route.query.invitation}`
      : ''
)
useHead(() => ({ title: t('accountTitle') }))
const submit = async () => {
  if (pending.value) return
  error.value = ''
  confirmationError.value = password.value !== confirmation.value ? t('passwordMismatch') : ''
  if (confirmationError.value) return
  pending.value = true
  try {
    await $fetch('/api/auth/sign-up/email', {
      method: 'POST',
      body: { name: name.value, email: email.value, password: password.value }
    })
    await refresh()
    await navigateTo(invitationPath.value || '/organizations/new')
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
    <h1>{{ t('accountTitle') }}</h1>
    <p class="lead">{{ t('accountIntro') }}</p>
    <template v-if="user"
      ><ThemeNotice>{{ t('signedInAs') }} {{ user.email }}</ThemeNotice
      ><ThemeLink :to="invitationPath || '/organizations'">{{
        invitationPath ? t('acceptInvitation') : t('organizations')
      }}</ThemeLink></template
    >
    <form v-else class="portal-form" @submit.prevent="submit">
      <ThemeNotice v-if="error" variant="error" :title="t('errorTitle')">{{ error }}</ThemeNotice>
      <p class="form-note">{{ t('requiredHint') }}</p>
      <ThemeInput
        id="register-name"
        v-model="name"
        :label="t('fullName')"
        autocomplete="name"
        :maxlength="120"
        required
      />
      <ThemeInput
        id="register-email"
        v-model="email"
        :label="t('email')"
        type="email"
        autocomplete="email"
        :maxlength="254"
        required
      />
      <ThemeInput
        id="register-password"
        v-model="password"
        :label="t('password')"
        type="password"
        autocomplete="new-password"
        :minlength="12"
        :hint="t('passwordHint')"
        :maxlength="128"
        required
      />
      <ThemeInput
        id="register-confirmation"
        v-model="confirmation"
        :label="t('confirmPassword')"
        type="password"
        autocomplete="new-password"
        :maxlength="128"
        :error="confirmationError"
        required
      />
      <div class="form-actions">
        <ThemeButton type="submit" :loading="pending" :disabled="pending">{{
          t('register')
        }}</ThemeButton>
      </div>
    </form>
    <p class="form-alternative">
      {{ t('haveAccount') }}
      <ThemeLink
        :to="invitationPath ? `/login?next=${encodeURIComponent(invitationPath)}` : '/login'"
        >{{ t('signIn') }}</ThemeLink
      >
    </p>
  </div>
</template>

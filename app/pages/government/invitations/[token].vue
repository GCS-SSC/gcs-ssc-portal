<script setup lang="ts">
import type { InvitationPreview } from '~~/shared/types/api'
definePageMeta({ key: (route) => route.params.token as string })
const route = useRoute()
const token = String(route.params.token)
const { t, date } = useLocale()
const { g } = useGovernmentLocale()
const { user, signOut, refresh } = usePortalSession()
const message = useApiMessage()
const api = usePortalApi()
const pending = ref(false)
const error = ref('')
const {
  data,
  error: loadError,
  status
} = await useFetch<Pick<InvitationPreview, 'name' | 'email' | 'expiresAt'>>(
  `/api/government/invitations/${encodeURIComponent(token)}`
)
const matchesEmail = computed(
  () => user.value?.email.toLowerCase() === data.value?.email.toLowerCase()
)
useHead(() => ({
  title: g('staffInvitation'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
}))
const switchAccount = async () => {
  try {
    await signOut(
      `/government/login?next=${encodeURIComponent(`/government/invitations/${token}`)}`
    )
  } catch (failure) {
    error.value = message(failure)
  }
}
const accept = async () => {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    await api<unknown>(`/api/government/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: {}
    })
    await refresh()
    await navigateTo('/government')
  } catch (failure) {
    error.value = message(failure)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <div class="form-page">
    <p v-if="status === 'pending'" role="status">{{ t('loading') }}</p>
    <template v-else-if="loadError"
      ><h1>{{ t('invitationUnavailable') }}</h1>
      <p class="lead">{{ t('invitationUnavailableText') }}</p>
      <ThemeLink to="/">{{ t('returnHome') }}</ThemeLink></template
    >
    <template v-else-if="data">
      <p class="eyebrow">GCS–SSC</p>
      <h1>{{ g('staffInvitation') }}</h1>
      <p class="lead">
        {{ g('staffInvitationIntro') }}
      </p>
      <dl class="detail-list">
        <div>
          <dt>{{ t('invitedEmail') }}</dt>
          <dd>{{ data.email }}</dd>
        </div>
      </dl>
      <p>{{ t('invitationExpires', { date: date(data.expiresAt) }) }}</p>
      <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice>
      <div v-if="!user" class="invitation-actions">
        <ThemeLink
          class="primary-link"
          :to="`/register?governmentInvitation=${encodeURIComponent(token)}&email=${encodeURIComponent(data.email)}`"
          >{{ t('joinAccount') }}</ThemeLink
        ><ThemeLink
          :to="`/government/login?next=${encodeURIComponent(`/government/invitations/${token}`)}`"
          >{{ t('joinSignIn') }}</ThemeLink
        >
      </div>
      <template v-else-if="!matchesEmail"
        ><ThemeNotice variant="error">{{ t('wrongEmail') }}</ThemeNotice
        ><ThemeButton variant="secondary" @click="switchAccount">{{
          t('signOut')
        }}</ThemeButton></template
      >
      <template v-else
        ><p>
          {{ t('signedInAs') }} <strong>{{ user.email }}</strong>
        </p>
        <ThemeButton :disabled="pending" :loading="pending" @click="accept">{{
          t('acceptInvitation')
        }}</ThemeButton></template
      >
    </template>
  </div>
</template>

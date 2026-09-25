<script setup lang="ts">
import type { InvitationPreview, Organization } from '~~/shared/types/api'
definePageMeta({ key: (route) => route.params.token as string })
const route = useRoute()
const token = String(route.params.token)
const { t, date } = useLocale()
const { user, signOut } = usePortalSession()
const message = useApiMessage()
const api = usePortalApi()
const pending = ref(false)
const error = ref('')
const {
  data,
  error: loadError,
  status
} = await useFetch<InvitationPreview>(`/api/invitations/${encodeURIComponent(token)}`)
const matchesEmail = computed(
  () => user.value?.email.toLowerCase() === data.value?.email.toLowerCase()
)
useHead(() => ({
  title: t('invitationTitle'),
  meta: [{ name: 'robots', content: 'noindex, nofollow' }]
}))
const switchAccount = async () => {
  try {
    await signOut(`/login?next=${encodeURIComponent(`/invitations/${token}`)}`)
  } catch (failure) {
    error.value = message(failure)
  }
}
const accept = async () => {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    const response = await api<{ organization: Organization }>(
      `/api/invitations/${encodeURIComponent(token)}/accept`,
      { method: 'POST', body: {} }
    )
    await navigateTo(`/organizations/${response.organization.id}`)
  } catch (failure) {
    error.value = message(failure)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <PortalContainer size="md">
    <PortalText v-if="status === 'pending'" role="status">{{ t('loading') }}</PortalText>
    <template v-else-if="loadError"
      ><PortalHeading tag="h1">{{ t('invitationUnavailable') }}</PortalHeading>
      <PortalText>{{ t('invitationUnavailableText') }}</PortalText>
      <PortalLink to="/">{{ t('returnHome') }}</PortalLink></template
    >
    <template v-else-if="data">
      <PortalText size="small" text-role="secondary">GCS–SSC</PortalText>
      <PortalHeading tag="h1">{{ t('invitationTitle') }}</PortalHeading>
      <PortalText>
        {{ t('invitationIntro', { organization: data.organizationName }) }}
      </PortalText>
      <dl class="detail-list">
        <div>
          <dt>{{ t('invitedEmail') }}</dt>
          <dd>{{ data.email }}</dd>
        </div>
      </dl>
      <PortalText>{{ t('invitationExpires', { date: date(data.expiresAt) }) }}</PortalText>
      <PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice>
      <div v-if="!user" class="invitation-actions">
        <PortalLink
          variant="button"
          :to="`/register?invitation=${encodeURIComponent(token)}&email=${encodeURIComponent(data.email)}`"
          >{{ t('joinAccount') }}</PortalLink
        ><PortalLink :to="`/login?next=${encodeURIComponent(`/invitations/${token}`)}`">{{
          t('joinSignIn')
        }}</PortalLink>
      </div>
      <template v-else-if="!matchesEmail"
        ><PortalNotice variant="error">{{ t('wrongEmail') }}</PortalNotice
        ><PortalButton variant="secondary" @click="switchAccount">{{
          t('signOut')
        }}</PortalButton></template
      >
      <template v-else
        ><PortalText>
          {{ t('signedInAs') }} <strong>{{ user.email }}</strong>
        </PortalText>
        <PortalButton :disabled="pending" :loading="pending" @click="accept">{{
          t('acceptInvitation')
        }}</PortalButton></template
      >
    </template>
  </PortalContainer>
</template>

<script setup lang="ts">
import type { Organization } from '~~/shared/types/api'
const { t } = useLocale()
const message = useApiMessage()
const api = usePortalApi()
const name = ref('')
const description = ref('')
const pending = ref(false)
const error = ref('')
useHead(() => ({ title: t('createOrg') }))
const submit = async () => {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    const { organization } = await api<{ organization: Organization }>('/api/organizations', {
      method: 'POST',
      body: { name: name.value, description: description.value }
    })
    await navigateTo(`/organizations/${organization.id}`)
  } catch (failure) {
    error.value = message(failure)
  } finally {
    pending.value = false
  }
}
</script>
<template>
  <PortalContainer size="md">
    <PortalHeading tag="h1">{{ t('createOrg') }}</PortalHeading>
    <PortalText>{{ t('createOrgIntro') }}</PortalText>
    <form class="portal-form" @submit.prevent="submit">
      <PortalNotice v-if="error" variant="error" :title="t('errorTitle')">{{ error }}</PortalNotice>
      <PortalInput
        id="organization-name"
        v-model="name"
        :label="t('organizationName')"
        :minlength="2"
        :hint="t('organizationNameHint')"
        :maxlength="120"
        required
      />
      <PortalInput
        id="organization-description"
        v-model="description"
        :label="t('organizationDescription')"
        :hint="t('organizationDescriptionHint')"
        :maxlength="2000"
      />
      <div class="form-actions">
        <PortalButton type="submit" :disabled="pending" :loading="pending">{{
          t('create')
        }}</PortalButton
        ><PortalLink to="/organizations">{{ t('cancel') }}</PortalLink>
      </div>
    </form>
  </PortalContainer>
</template>

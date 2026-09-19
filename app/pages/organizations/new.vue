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
  <div class="form-page">
    <ThemeLink to="/organizations">{{ t('backOrganizations') }}</ThemeLink>
    <h1>{{ t('createOrg') }}</h1>
    <p class="lead">{{ t('createOrgIntro') }}</p>
    <form class="portal-form" @submit.prevent="submit">
      <ThemeNotice v-if="error" variant="error" :title="t('errorTitle')">{{ error }}</ThemeNotice>
      <ThemeInput
        id="organization-name"
        v-model="name"
        :label="t('organizationName')"
        :minlength="2"
        :hint="t('organizationNameHint')"
        :maxlength="120"
        required
      />
      <ThemeInput
        id="organization-description"
        v-model="description"
        :label="t('organizationDescription')"
        :hint="t('organizationDescriptionHint')"
        :maxlength="2000"
      />
      <div class="form-actions">
        <ThemeButton type="submit" :disabled="pending" :loading="pending">{{
          t('create')
        }}</ThemeButton
        ><ThemeLink to="/organizations">{{ t('cancel') }}</ThemeLink>
      </div>
    </form>
  </div>
</template>

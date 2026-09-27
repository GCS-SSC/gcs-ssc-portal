<script setup lang="ts">
import type { Agency } from '~~/shared/types/government'

const { g } = useGovernmentLocale()
const { t } = useLocale()
const api = usePortalApi()
const message = useApiMessage()
const nameEn = ref('')
const nameFr = ref('')
const pending = ref(false)
const error = ref('')
useHead(() => ({ title: g('newAgency') }))

const submit = async () => {
  if (pending.value) return
  pending.value = true
  error.value = ''
  try {
    const { agency } = await api<{ agency: Agency }>('/api/admin/agencies', {
      method: 'POST',
      body: { nameEn: nameEn.value, nameFr: nameFr.value }
    })
    await navigateTo(`/admin/agencies/${agency.id}`)
  } catch (failure) {
    error.value = message(failure)
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <PortalContainer size="md">
    <PortalHeading tag="h1">{{ g('newAgency') }}</PortalHeading>
    <PortalText>{{ g('createAgencyIntro') }}</PortalText>
    <form class="portal-form" @submit.prevent="submit">
      <PortalNotice v-if="error" variant="error" :title="t('errorTitle')">{{ error }}</PortalNotice>
      <PortalInput id="agency-en" v-model="nameEn" :label="g('nameEn')" :maxlength="200" required />
      <PortalInput id="agency-fr" v-model="nameFr" :label="g('nameFr')" :maxlength="200" required />
      <div class="form-actions">
        <PortalButton type="submit" :disabled="pending" :loading="pending">{{
          g('create')
        }}</PortalButton>
        <PortalLink to="/admin">{{ t('cancel') }}</PortalLink>
      </div>
    </form>
  </PortalContainer>
</template>

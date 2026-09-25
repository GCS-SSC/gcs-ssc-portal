<script setup lang="ts">
import type { Agency } from '~~/shared/types/government'
const { g, localized } = useGovernmentLocale()
const { t } = useLocale()
const api = usePortalApi()
const message = useApiMessage()
const { busy, error, perform } = useGovernmentAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData('admin-agencies', () => api<{ agencies: Agency[] }>('/api/admin/agencies'))
const nameEn = ref('')
const nameFr = ref('')
const create = () =>
  perform(async () => {
    await api('/api/admin/agencies', {
      method: 'POST',
      body: { nameEn: nameEn.value, nameFr: nameFr.value }
    })
    nameEn.value = ''
    nameFr.value = ''
    await refresh()
  })
useHead(() => ({ title: g('agencies') }))
</script>
<template>
  <section>
    <PortalHeading tag="h1">{{ g('agencies') }}</PortalHeading>
    <PortalText>{{ g('adminAgencyIntro') }}</PortalText>
    <PortalNotice v-if="loadError" variant="error"
      >{{ message(loadError) }}
      <PortalButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</PortalButton></PortalNotice
    >
    <ul v-else-if="data?.agencies.length" class="service-list">
      <li v-for="agency in data.agencies" :key="agency.id">
        {{ localized(agency) }} <code>{{ agency.id }}</code>
      </li>
    </ul>
    <PortalText v-else>{{ g('noAgencies') }}</PortalText>
    <section class="content-section">
      <PortalHeading tag="h2">{{ g('newAgency') }}</PortalHeading>
      <PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice>
      <form class="portal-form" @submit.prevent="create">
        <PortalInput
          id="agency-en"
          v-model="nameEn"
          :label="g('nameEn')"
          :maxlength="200"
          required
        />
        <PortalInput
          id="agency-fr"
          v-model="nameFr"
          :label="g('nameFr')"
          :maxlength="200"
          required
        />
        <PortalButton type="submit" :disabled="busy" :loading="busy">{{
          g('create')
        }}</PortalButton>
      </form>
    </section>
  </section>
</template>

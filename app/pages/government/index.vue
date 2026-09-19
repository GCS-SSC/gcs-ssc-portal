<script setup lang="ts">
import type { Agency } from '~~/shared/types/government'
const { g, localized } = useGovernmentLocale()
const { t } = useLocale()
const api = usePortalApi()
const { busy, error, success, perform } = useGovernmentAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData('government-agencies', () =>
  api<{ agencies: Agency[] }>('/api/government/agencies')
)
const message = useApiMessage()
const nameEn = ref(''),
  nameFr = ref('')
useHead(() => ({ title: g('agencies') }))
const create = () =>
  perform(async () => {
    const result = await api<{ agency: Agency }>('/api/government/agencies', {
      method: 'POST',
      body: { nameEn: nameEn.value, nameFr: nameFr.value }
    })
    await refresh()
    await navigateTo(`/government/agencies/${result.agency.id}`)
  })
</script>
<template>
  <section>
    <p class="eyebrow">{{ g('government') }}</p>
    <h1>{{ g('agencies') }}</h1>
    <p class="lead">{{ g('agencyIntro') }}</p>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ message(loadError) }}
      <ThemeButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</ThemeButton></ThemeNotice
    >
    <ul v-else-if="data?.agencies.length" class="service-list">
      <li v-for="agency in data.agencies" :key="agency.id">
        <ThemeLink :to="`/government/agencies/${agency.id}`">{{ localized(agency) }}</ThemeLink>
      </li>
    </ul>
    <p v-else>{{ g('noAgencies') }}</p>
    <section class="content-section">
      <h2>{{ g('newAgency') }}</h2>
      <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice>
      <ThemeNotice v-if="success" variant="success">{{ success }}</ThemeNotice>
      <form class="portal-form" @submit.prevent="create">
        <ThemeInput
          id="agency-en"
          v-model="nameEn"
          :label="g('nameEn')"
          :maxlength="200"
          required
        />
        <ThemeInput
          id="agency-fr"
          v-model="nameFr"
          :label="g('nameFr')"
          :maxlength="200"
          required
        />
        <div class="form-actions">
          <ThemeButton type="submit" :disabled="busy" :loading="busy">{{
            g('create')
          }}</ThemeButton>
        </div>
      </form>
    </section>
  </section>
</template>

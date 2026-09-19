<script setup lang="ts">
import type { SubmissionSet, SetResponse } from '~~/shared/types/cases'
import type { Organization } from '~~/shared/types/api'
import { setSubjects } from '~~/shared/schemas/cases'
import { hasAccess } from '~~/shared/utils/permissions'
definePageMeta({ key: (route) => route.fullPath })
const id = String(useRoute().params.id),
  base = `/api/organizations/${id}`
const api = usePortalApi(),
  { c, errorMessage } = useCaseLocale(),
  { localized } = useGovernmentLocale(),
  { locale } = useLocale()
const { busy, error, perform } = useCaseAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData(`work-${id}`, async () => {
  const [organization, sets, responses] = await Promise.all([
    api<{ organization: Organization }>(base),
    api<{ sets: SubmissionSet[] }>(`${base}/sets`),
    api<{
      responses: {
        id: string
        nameEn: string
        nameFr: string
        status: 'draft' | 'submitted'
        updatedAt: string
      }[]
    }>(`${base}/responses`)
  ])
  return { ...organization, ...sets, ...responses }
})
const start = (set: SubmissionSet) =>
  perform(async () => {
    const result = await api<{ response: SetResponse }>(`${base}/sets/${set.id}/responses`, {
      method: 'POST',
      body: { locale: locale.value }
    })
    await navigateTo(`/organizations/${id}/responses/${result.response.id}`)
  })
</script>
<template>
  <section>
    <ThemeLink :to="`/organizations/${id}`">{{ c('back') }}</ThemeLink>
    <h1>{{ c('cases') }}</h1>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <ThemeButton @click="refresh()">{{ c('reload') }}</ThemeButton></ThemeNotice
    >
    <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice>
    <template v-if="data">
      <h2>{{ c('sets') }}</h2>
      <p v-if="!data.sets.length">{{ c('empty') }}</p>
      <ul class="service-list">
        <li v-for="set in data.sets" :key="set.id">
          <ThemeLink :to="`/organizations/${id}/sets/${set.id}`">{{ localized(set) }}</ThemeLink>
          <span>{{ set.items.map((item) => c(item.kind)).join(' → ') }}</span>
          <ThemeButton
            v-if="
              setSubjects(set.items).every((subject) =>
                hasAccess(data!.organization.permissions, subject, 'contributor')
              )
            "
            variant="link"
            :disabled="busy"
            @click="start(set)"
            >{{ c('start') }}</ThemeButton
          >
          <span v-else>{{ c('viewOnly') }}</span>
        </li>
      </ul>
      <h2>{{ c('responses') }}</h2>
      <p v-if="!data.responses.length">{{ c('empty') }}</p>
      <ul class="service-list">
        <li v-for="response in data.responses" :key="response.id">
          <ThemeLink :to="`/organizations/${id}/responses/${response.id}`">{{
            localized(response)
          }}</ThemeLink
          ><ThemeBadge>{{ c(response.status) }}</ThemeBadge
          ><span>{{ response.updatedAt }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

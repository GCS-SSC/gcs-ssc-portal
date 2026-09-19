<script setup lang="ts">
import type { SubmissionSet, SetResponse } from '~~/shared/types/cases'
import type { Organization } from '~~/shared/types/api'
import { setSubjects } from '~~/shared/schemas/cases'
import { hasAccess } from '~~/shared/utils/permissions'
import SurveyPreview from '~/components/survey/SurveyPreview.vue'
definePageMeta({ key: (route) => route.fullPath })
const route = useRoute(),
  id = String(route.params.id),
  setId = String(route.params.setId),
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
} = await useAsyncData(`published-set-${setId}`, async () => {
  const [set, org] = await Promise.all([
    api<{ set: SubmissionSet }>(`${base}/sets/${setId}`),
    api<{ organization: Organization }>(base)
  ])
  return { ...set, ...org }
})
const start = () =>
  perform(async () => {
    const result = await api<{ response: SetResponse }>(`${base}/sets/${setId}/responses`, {
      method: 'POST',
      body: { locale: locale.value }
    })
    await navigateTo(`/organizations/${id}/responses/${result.response.id}`)
  })
</script>
<template>
  <section>
    <ThemeLink :to="`/organizations/${id}/work`">{{ c('back') }}</ThemeLink>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <ThemeButton @click="refresh()">{{ c('reload') }}</ThemeButton></ThemeNotice
    >
    <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice>
    <template v-if="data?.set.snapshot">
      <h1>{{ localized(data.set) }}</h1>
      <p v-if="data.set.snapshot.caseReference">
        {{ c('agreementNumber') }}: {{ data.set.snapshot.caseReference.agreementNumber }}
      </p>
      <ol>
        <li v-for="entry in data.set.snapshot.items" :key="entry.item.id">
          {{ entry.survey?.title[locale] ?? c(entry.item.kind) }}
        </li>
      </ol>
      <ThemeButton
        v-if="
          setSubjects(data.set.items).every((subject) =>
            hasAccess(data!.organization.permissions, subject, 'contributor')
          )
        "
        :disabled="busy"
        @click="start"
        >{{ c('start') }}</ThemeButton
      >
      <SurveyPreview
        v-for="entry in data.set.snapshot.items.filter((item) => item.survey)"
        :key="entry.item.id"
        :definition="entry.survey!"
      />
    </template>
  </section>
</template>

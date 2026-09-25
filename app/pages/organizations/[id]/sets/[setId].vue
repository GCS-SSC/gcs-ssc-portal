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
    <PortalLink :to="`/organizations/${id}?section=work`">{{ c('back') }}</PortalLink>
    <PortalNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <PortalButton @click="refresh()">{{ c('reload') }}</PortalButton></PortalNotice
    >
    <PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice>
    <template v-if="data?.set.snapshot">
      <PortalHeading tag="h1">{{ localized(data.set) }}</PortalHeading>
      <PortalText v-if="data.set.snapshot.caseReference">
        {{ c('agreementNumber') }}: {{ data.set.snapshot.caseReference.agreementNumber }}
      </PortalText>
      <ol>
        <li v-for="entry in data.set.snapshot.items" :key="entry.item.id">
          {{ entry.survey?.title[locale] ?? c(entry.item.kind) }}
        </li>
      </ol>
      <PortalButton
        v-if="
          setSubjects(data.set.items).every((subject) =>
            hasAccess(data!.organization.permissions, subject, 'contributor')
          )
        "
        :disabled="busy"
        @click="start"
        >{{ c('start') }}</PortalButton
      >
      <SurveyPreview
        v-for="entry in data.set.snapshot.items.filter((item) => item.survey)"
        :key="entry.item.id"
        :definition="entry.survey!"
      />
    </template>
  </section>
</template>

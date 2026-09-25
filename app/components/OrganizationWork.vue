<script setup lang="ts">
import type { SubmissionSet, SetResponse } from '~~/shared/types/cases'
import type { Organization } from '~~/shared/types/api'
import { setSubjects } from '~~/shared/schemas/cases'
import { hasAccess } from '~~/shared/utils/permissions'
const props = defineProps<{ organizationId: string; embedded?: boolean }>()
const id = props.organizationId,
  base = `/api/organizations/${id}`
const api = usePortalApi(),
  { c, errorMessage } = useCaseLocale(),
  { localized } = useGovernmentLocale(),
  { locale, t, date } = useLocale()
const { busy, error, perform } = useCaseAction()
const {
  data,
  error: loadError,
  refresh,
  status: loadStatus
} = useAsyncData(`work-${id}`, async () => {
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
    <PortalLink v-if="!embedded" :to="`/organizations/${id}`">{{ c('back') }}</PortalLink>
    <PortalHeading :tag="embedded ? 'h2' : 'h1'" margin-top="0">{{ c('cases') }}</PortalHeading>
    <PortalText v-if="loadStatus === 'pending'" role="status">{{ t('loading') }}</PortalText>
    <PortalNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <PortalButton @click="refresh()">{{ c('reload') }}</PortalButton></PortalNotice
    >
    <PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice>
    <template v-if="data">
      <PortalHeading :tag="embedded ? 'h3' : 'h2'">{{ c('sets') }}</PortalHeading>
      <PortalText v-if="!data.sets.length">{{ c('empty') }}</PortalText>
      <ul class="service-list">
        <li v-for="set in data.sets" :key="set.id">
          <PortalLink :to="`/organizations/${id}/sets/${set.id}`">{{ localized(set) }}</PortalLink>
          <span>{{ set.items.map((item) => c(item.kind)).join(' → ') }}</span>
          <PortalButton
            v-if="
              setSubjects(set.items).every((subject) =>
                hasAccess(data!.organization.permissions, subject, 'contributor')
              )
            "
            variant="secondary"
            :disabled="busy"
            @click="start(set)"
            >{{ c('start') }}</PortalButton
          >
          <span v-else>{{ c('viewOnly') }}</span>
        </li>
      </ul>
      <PortalHeading :tag="embedded ? 'h3' : 'h2'">{{ c('responses') }}</PortalHeading>
      <PortalText v-if="!data.responses.length">{{ c('empty') }}</PortalText>
      <ul class="service-list">
        <li v-for="response in data.responses" :key="response.id">
          <PortalLink :to="`/organizations/${id}/responses/${response.id}`">{{
            localized(response)
          }}</PortalLink
          ><PortalBadge>{{ c(response.status) }}</PortalBadge
          ><span>{{ date(response.updatedAt) }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

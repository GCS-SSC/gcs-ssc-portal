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
  { locale, t } = useLocale()
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
    <component :is="embedded ? 'h2' : 'h1'">{{ c('cases') }}</component>
    <p v-if="loadStatus === 'pending'" role="status">{{ t('loading') }}</p>
    <PortalNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <PortalButton @click="refresh()">{{ c('reload') }}</PortalButton></PortalNotice
    >
    <PortalNotice v-if="error" variant="error">{{ error }}</PortalNotice>
    <template v-if="data">
      <component :is="embedded ? 'h3' : 'h2'">{{ c('sets') }}</component>
      <p v-if="!data.sets.length">{{ c('empty') }}</p>
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
            variant="link"
            :disabled="busy"
            @click="start(set)"
            >{{ c('start') }}</PortalButton
          >
          <span v-else>{{ c('viewOnly') }}</span>
        </li>
      </ul>
      <component :is="embedded ? 'h3' : 'h2'">{{ c('responses') }}</component>
      <p v-if="!data.responses.length">{{ c('empty') }}</p>
      <ul class="service-list">
        <li v-for="response in data.responses" :key="response.id">
          <PortalLink :to="`/organizations/${id}/responses/${response.id}`">{{
            localized(response)
          }}</PortalLink
          ><PortalBadge>{{ c(response.status) }}</PortalBadge
          ><span>{{ response.updatedAt }}</span>
        </li>
      </ul>
    </template>
  </section>
</template>

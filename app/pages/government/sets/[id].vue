<script setup lang="ts">
import { createLocalId } from '~/utils/local-id'
import type { FundingCase, SubmissionSet } from '~~/shared/types/cases'
import type { SetInput, SetItem } from '~~/shared/schemas/cases'
import { setInput } from '~~/shared/schemas/cases'
import type { SurveySummary } from '~~/shared/types/survey'
definePageMeta({ key: (route) => route.fullPath })
const { a } = useAttachmentLocale()
const route = useRoute(),
  id = String(route.params.id),
  agencyId = String(route.query.agencyId ?? '')
const api = usePortalApi(),
  { c, errorMessage } = useCaseLocale(),
  { localized } = useGovernmentLocale(),
  { locale } = useLocale()
const { busy, error, success, perform } = useCaseAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData(`set-editor-${id}-${agencyId}`, async () => {
  const [cases, surveys, existing] = await Promise.all([
    api<{ cases: FundingCase[] }>(`/api/government/agencies/${agencyId}/cases`),
    api<{ surveys: SurveySummary[] }>(`/api/government/agencies/${agencyId}/surveys`),
    id === 'new' ? Promise.resolve(null) : api<{ set: SubmissionSet }>(`/api/government/sets/${id}`)
  ])
  return { ...cases, ...surveys, existing: existing?.set }
})
const value = ref<SetInput>({
  agencyId,
  organizationId: '',
  caseId: null,
  nameEn: '',
  nameFr: '',
  sourceSystem: 'gcs-ssc',
  foreignSystemId: null,
  items: []
})
const revision = ref(1),
  published = ref(false)
watch(
  data,
  (next) => {
    if (!next?.existing) return
    const row = next.existing
    value.value = structuredClone({
      agencyId: row.agencyId,
      organizationId: row.organizationId,
      caseId: row.caseId,
      nameEn: row.nameEn,
      nameFr: row.nameFr,
      sourceSystem: row.sourceSystem,
      foreignSystemId: row.foreignSystemId,
      items: row.items
    })
    revision.value = row.revision
    published.value = row.published
  },
  { immediate: true }
)
const selectedCase = computed(() =>
  data.value?.cases.find((entry) => entry.id === value.value.caseId)
)
const years = computed(() => [
  { value: '', label: c('choose') },
  ...(selectedCase.value?.config.fiscalYears ?? []).map((year) => ({
    value: year.id,
    label: `${year.startYear}–${year.startYear + 1}`
  }))
])
const selectCase = (caseId: string) => {
  value.value.caseId = caseId || null
  if (selectedCase.value) value.value.organizationId = selectedCase.value.organizationId
  value.value.items = value.value.items.filter((item) => item.kind === 'survey')
}
const addItem = () =>
  value.value.items.push({
    id: createLocalId(),
    kind: 'survey',
    surveyId: '',
    surveyRevision: 1
  })
const changeKind = (index: number, kind: string) => {
  const item = value.value.items[index]!
  value.value.items[index] =
    kind === 'survey'
      ? { id: item.id, kind, surveyId: '', surveyRevision: 1 }
      : {
          id: item.id,
          kind: kind as 'claim' | 'forecast',
          fiscalYearId: selectedCase.value?.config.fiscalYears[0]?.id ?? ''
        }
}
const selectSurvey = (item: SetItem, surveyId: string) => {
  if (item.kind === 'survey') {
    item.surveyId = surveyId
    item.surveyRevision =
      data.value?.surveys.find((survey) => survey.id === surveyId)?.revision ?? 1
  }
}
const move = (index: number, direction: number) => {
  const items = value.value.items
  ;[items[index], items[index + direction]] = [items[index + direction]!, items[index]!]
}
const save = () =>
  perform(async () => {
    const parsed = setInput.safeParse(value.value)
    if (!parsed.success) {
      error.value = c('invalid')
      return
    }
    const result = await api<{ set: SubmissionSet }>(
      `/api/government/sets${id === 'new' ? '' : `/${id}`}`,
      {
        method: id === 'new' ? 'POST' : 'PUT',
        body: id === 'new' ? parsed.data : { expectedRevision: revision.value, value: parsed.data }
      }
    )
    if (id === 'new') await navigateTo(`/government/sets/${result.set.id}?agencyId=${agencyId}`)
    else await refresh()
  })
const publication = () =>
  perform(async () => {
    await api<unknown>(`/api/government/sets/${id}/${published.value ? 'withdraw' : 'publish'}`, {
      method: 'POST',
      body: { expectedRevision: revision.value }
    })
    await refresh()
  })
const dirty = computed(() => {
  const old = data.value?.existing
  return (
    !!old &&
    JSON.stringify(value.value) !==
      JSON.stringify({
        agencyId: old.agencyId,
        organizationId: old.organizationId,
        caseId: old.caseId,
        nameEn: old.nameEn,
        nameFr: old.nameFr,
        sourceSystem: old.sourceSystem,
        foreignSystemId: old.foreignSystemId,
        items: old.items
      })
  )
})
</script>
<template>
  <section>
    <ThemeLink :to="`/government/cases?agencyId=${agencyId}`">{{ c('back') }}</ThemeLink>
    <h1>{{ id === 'new' ? c('newSet') : localized(value) }}</h1>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <ThemeButton @click="refresh()">{{ c('reload') }}</ThemeButton></ThemeNotice
    >
    <template v-else-if="data">
      <p>{{ c('publishedHint') }}</p>
      <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice
      ><ThemeNotice v-if="success && !error" variant="success">{{ success }}</ThemeNotice>
      <form novalidate @submit.prevent="save">
        <fieldset class="portal-form" :disabled="busy || published">
          <legend>{{ c('sets') }}</legend>
          <ThemeSelect
            id="set-case"
            :model-value="value.caseId ?? ''"
            :label="c('scope')"
            :options="[
              { value: '', label: c('orgScope') },
              ...data.cases.map((entry) => ({ value: entry.id, label: localized(entry) }))
            ]"
            :disabled="busy || published || id !== 'new'"
            @update:model-value="selectCase"
          />
          <ThemeInput
            id="set-org"
            v-model="value.organizationId"
            :label="c('organizationId')"
            :hint="c('organizationHint')"
            required
            :disabled="busy || published || id !== 'new' || !!value.caseId"
          />
          <ThemeInput
            id="set-en"
            v-model="value.nameEn"
            :disabled="busy || published"
            :label="c('nameEn')"
            required
            :maxlength="200"
          />
          <ThemeInput
            id="set-fr"
            v-model="value.nameFr"
            :disabled="busy || published"
            :label="c('nameFr')"
            required
            :maxlength="200"
          />
          <ThemeInput
            id="set-source"
            v-model="value.sourceSystem"
            :disabled="busy || published"
            :label="c('sourceSystem')"
            required
          />
          <ThemeInput
            id="set-foreign"
            :disabled="busy || published"
            :model-value="value.foreignSystemId ?? ''"
            :label="c('foreignSystemId')"
            :hint="c('foreignHint')"
            @update:model-value="value.foreignSystemId = $event || null"
          />
        </fieldset>
        <h2>{{ c('items') }}</h2>
        <fieldset
          v-for="(item, index) in value.items"
          :key="item.id"
          class="portal-form content-section"
          :disabled="busy || published"
        >
          <legend>{{ c('item') }} {{ index + 1 }}</legend>
          <ThemeSelect
            :id="`item-kind-${index}`"
            :disabled="busy || published"
            :model-value="item.kind"
            :label="c('kind')"
            :options="
              (value.caseId
                ? (['survey', 'claim', 'forecast'] as const)
                : (['survey'] as const)
              ).map((kind) => ({ value: kind, label: c(kind) }))
            "
            required
            @update:model-value="changeKind(index, $event)"
          />
          <template v-if="item.kind === 'survey'">
            <ThemeSelect
              :id="`item-survey-${index}`"
              :disabled="busy || published"
              :model-value="item.surveyId"
              :label="c('survey')"
              :options="[
                { value: '', label: c('choose') },
                ...data.surveys.map((survey) => ({ value: survey.id, label: survey.title[locale] }))
              ]"
              required
              @update:model-value="selectSurvey(item, $event)"
            />
            <ThemeInput
              :id="`item-revision-${index}`"
              :disabled="busy || published"
              :model-value="String(item.surveyRevision)"
              :label="c('revision')"
              required
              @update:model-value="item.surveyRevision = Number($event)"
            />
          </template>
          <ThemeSelect
            v-else
            :id="`item-year-${index}`"
            v-model="item.fiscalYearId"
            :disabled="busy || published"
            :label="c('fiscalYear')"
            :options="years"
            required
          />
          <ThemeSelect
            v-if="item.kind !== 'survey'"
            :id="`item-attachments-${index}`"
            :label="a('allow')"
            :disabled="busy || published"
            :model-value="item.attachments?.enabled ? 'yes' : 'no'"
            :options="[
              { value: 'no', label: a('no') },
              { value: 'yes', label: a('yes') }
            ]"
            @update:model-value="item.attachments = { enabled: $event === 'yes' }"
          />
          <div class="form-actions">
            <ThemeButton
              variant="secondary"
              :disabled="busy || published || index === 0"
              @click="move(index, -1)"
              >{{ c('up') }}</ThemeButton
            >
            <ThemeButton
              variant="secondary"
              :disabled="busy || published || index === value.items.length - 1"
              @click="move(index, 1)"
              >{{ c('down') }}</ThemeButton
            >
            <ThemeButton
              variant="secondary"
              :disabled="busy || published"
              @click="value.items.splice(index, 1)"
              >{{ c('remove') }}</ThemeButton
            >
          </div>
        </fieldset>
        <div v-if="!published" class="form-actions">
          <ThemeButton
            variant="secondary"
            :disabled="busy || value.items.length >= 10"
            @click="addItem"
            >{{ c('addItem') }}</ThemeButton
          ><ThemeButton type="submit" :disabled="busy || !value.items.length">{{
            c('save')
          }}</ThemeButton>
        </div>
      </form>
      <div v-if="id !== 'new'" class="form-actions">
        <ThemeButton :disabled="busy || dirty" @click="publication">{{
          c(published ? 'withdraw' : 'publish')
        }}</ThemeButton>
      </div>
      <p v-if="dirty">{{ c('dirty') }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import type { FundingCase } from '~~/shared/types/cases'
import type { CaseInput } from '~~/shared/schemas/cases'
import { caseInput } from '~~/shared/schemas/cases'
import type { Stream } from '~~/shared/types/government'
import { currencyCodes } from '~~/shared/utils/currencies'
definePageMeta({ key: (route) => route.fullPath })
const route = useRoute(),
  id = String(route.params.id),
  agencyId = String(route.query.agencyId ?? '')
const api = usePortalApi(),
  { c, errorMessage } = useCaseLocale(),
  { localized } = useGovernmentLocale()
const { busy, error, success, perform } = useCaseAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData(`case-editor-${id}-${agencyId}`, async () => ({
  structure: await api<{ streams: Stream[] }>(`/api/government/agencies/${agencyId}`),
  existing:
    id === 'new' ? null : (await api<{ case: FundingCase }>(`/api/government/cases/${id}`)).case
}))
const value = ref<CaseInput>({
  nameEn: '',
  nameFr: '',
  organizationId: '',
  streamId: '',
  agreementNumber: '',
  config: {
    sourceSystem: 'gcs-ssc',
    foreignSystemId: null,
    externalStreamId: null,
    externalApplicantRecipientId: null,
    fiscalYears: [],
    budgetLines: []
  }
})
const revision = ref(1)
watch(
  data,
  (next) => {
    if (next?.existing) {
      const row = next.existing
      value.value = structuredClone({
        nameEn: row.nameEn,
        nameFr: row.nameFr,
        organizationId: row.organizationId,
        streamId: row.streamId,
        agreementNumber: row.agreementNumber,
        config: row.config
      })
      revision.value = row.revision
    }
  },
  { immediate: true }
)
const years = computed(() => [
  { value: '', label: c('choose') },
  ...value.value.config.fiscalYears.map((year) => ({
    value: year.id,
    label: `${year.startYear}–${year.startYear + 1}`
  }))
])
const streams = computed(() => [
  { value: '', label: c('choose') },
  ...(data.value?.structure.streams ?? []).map((stream) => ({
    value: stream.id,
    label: localized(stream)
  }))
])
const addYear = () =>
  value.value.config.fiscalYears.push({
    id: crypto.randomUUID(),
    startYear: new Date().getFullYear(),
    foreignSystemId: null
  })
const addLine = () =>
  value.value.config.budgetLines.push({
    id: crypto.randomUUID(),
    fiscalYearId: value.value.config.fiscalYears[0]?.id ?? '',
    foreignSystemId: null,
    nameEn: '',
    nameFr: '',
    costCategory: '',
    costSubsection: '',
    budgetedAmount: '0.00',
    balance: null,
    claimedAmount: null,
    forecastAmount: null,
    balanceAsOf: null,
    currency: 'cad'
  })
const save = () =>
  perform(async () => {
    const parsed = caseInput.safeParse(value.value)
    if (!parsed.success) {
      error.value = c('invalid')
      return
    }
    const result = await api<{ case: FundingCase }>(
      `/api/government/cases${id === 'new' ? '' : `/${id}`}`,
      {
        method: id === 'new' ? 'POST' : 'PUT',
        body: id === 'new' ? parsed.data : { expectedRevision: revision.value, value: parsed.data }
      }
    )
    if (id === 'new') await navigateTo(`/government/cases/${result.case.id}?agencyId=${agencyId}`)
    else await refresh()
  })
</script>
<template>
  <section>
    <ThemeLink :to="`/government/cases?agencyId=${agencyId}`">{{ c('back') }}</ThemeLink>
    <h1>{{ id === 'new' ? c('newCase') : localized(value) }}</h1>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ errorMessage(loadError) }}
      <ThemeButton @click="refresh()">{{ c('reload') }}</ThemeButton></ThemeNotice
    >
    <form v-else-if="data" novalidate @submit.prevent="save">
      <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice
      ><ThemeNotice v-if="success && !error" variant="success">{{ success }}</ThemeNotice>
      <fieldset :disabled="busy" class="portal-form">
        <legend>{{ c('caseTitle') }}</legend>
        <ThemeInput
          id="case-name-en"
          v-model="value.nameEn"
          :disabled="busy"
          :label="c('nameEn')"
          required
          :maxlength="200"
        />
        <ThemeInput
          id="case-name-fr"
          v-model="value.nameFr"
          :disabled="busy"
          :label="c('nameFr')"
          required
          :maxlength="200"
        />
        <ThemeInput
          id="case-org"
          v-model="value.organizationId"
          :label="c('organizationId')"
          :hint="c('organizationHint')"
          required
          :disabled="id !== 'new'"
        />
        <ThemeSelect
          id="case-stream"
          v-model="value.streamId"
          :label="c('stream')"
          :options="streams"
          required
          :disabled="id !== 'new'"
        />
        <ThemeInput
          id="case-agreement"
          v-model="value.agreementNumber"
          :disabled="busy"
          :label="c('agreementNumber')"
          required
          :maxlength="15"
        />
        <ThemeInput
          id="case-source"
          v-model="value.config.sourceSystem"
          :label="c('sourceSystem')"
          required
          :disabled="id !== 'new'"
        />
        <ThemeInput
          v-for="field in [
            'foreignSystemId',
            'externalStreamId',
            'externalApplicantRecipientId'
          ] as const"
          :id="`case-${field}`"
          :key="field"
          :disabled="busy"
          :model-value="value.config[field] ?? ''"
          :label="c(field)"
          :hint="c('foreignHint')"
          @update:model-value="value.config[field] = $event || null"
        />
      </fieldset>
      <section class="content-section">
        <h2>{{ c('fiscalYears') }}</h2>
        <fieldset
          v-for="(year, index) in value.config.fiscalYears"
          :key="year.id"
          class="portal-form content-section"
          :disabled="busy"
        >
          <legend>{{ c('fiscalYear') }} {{ index + 1 }}</legend>
          <ThemeInput
            :id="`year-${index}`"
            :disabled="busy"
            :model-value="String(year.startYear)"
            :label="c('startYear')"
            required
            @update:model-value="year.startYear = Number($event)"
          />
          <ThemeInput
            :id="`year-foreign-${index}`"
            :disabled="busy"
            :model-value="year.foreignSystemId ?? ''"
            :label="c('foreignSystemId')"
            :hint="c('foreignHint')"
            @update:model-value="year.foreignSystemId = $event || null"
          />
          <ThemeButton
            variant="secondary"
            :disabled="value.config.budgetLines.some((line) => line.fiscalYearId === year.id)"
            @click="value.config.fiscalYears.splice(index, 1)"
            >{{ c('remove') }}</ThemeButton
          >
        </fieldset>
        <ThemeButton
          variant="secondary"
          :disabled="busy || value.config.fiscalYears.length >= 20"
          @click="addYear"
          >{{ c('addYear') }}</ThemeButton
        >
      </section>
      <section class="content-section">
        <h2>{{ c('budget') }}</h2>
        <p>{{ c('moneyHint') }}</p>
        <fieldset
          v-for="(line, index) in value.config.budgetLines"
          :key="line.id"
          class="portal-form content-section"
          :disabled="busy"
        >
          <legend>{{ c('budget') }} {{ index + 1 }}</legend>
          <ThemeInput
            v-for="field in ['nameEn', 'nameFr', 'costCategory', 'costSubsection'] as const"
            :id="`line-${index}-${field}`"
            :key="field"
            v-model="line[field]"
            :disabled="busy"
            :label="c(field)"
            required
            :maxlength="field === 'costSubsection' ? 255 : 200"
          />
          <ThemeSelect
            :id="`line-${index}-year`"
            v-model="line.fiscalYearId"
            :disabled="busy"
            :label="c('fiscalYear')"
            :options="years"
            required
          />
          <ThemeInput
            :id="`line-${index}-foreign`"
            :disabled="busy"
            :model-value="line.foreignSystemId ?? ''"
            :label="c('foreignSystemId')"
            :hint="c('foreignHint')"
            @update:model-value="line.foreignSystemId = $event || null"
          />
          <ThemeSelect
            :id="`line-${index}-currency`"
            v-model="line.currency"
            :disabled="busy"
            :label="c('currency')"
            :options="currencyCodes.map((code) => ({ value: code, label: code.toUpperCase() }))"
            required
          />
          <ThemeInput
            :id="`line-${index}-budget`"
            v-model="line.budgetedAmount"
            :disabled="busy"
            :label="c('budgetedAmount')"
            required
          />
          <ThemeInput
            v-for="field in ['balance', 'claimedAmount', 'forecastAmount'] as const"
            :id="`line-${index}-${field}`"
            :key="field"
            :disabled="busy"
            :model-value="line[field] ?? ''"
            :label="c(field)"
            @update:model-value="line[field] = $event || null"
          />
          <ThemeInput
            :id="`line-${index}-asof`"
            :disabled="busy"
            :model-value="line.balanceAsOf ?? ''"
            :label="c('balanceAsOf')"
            :hint="c('timestampHint')"
            :required="
              line.balance !== null || line.claimedAmount !== null || line.forecastAmount !== null
            "
            @update:model-value="line.balanceAsOf = $event || null"
          />
          <ThemeButton variant="secondary" @click="value.config.budgetLines.splice(index, 1)">{{
            c('remove')
          }}</ThemeButton>
        </fieldset>
        <ThemeButton
          variant="secondary"
          :disabled="
            busy || !value.config.fiscalYears.length || value.config.budgetLines.length >= 200
          "
          @click="addLine"
          >{{ c('addLine') }}</ThemeButton
        >
      </section>
      <div class="form-actions">
        <ThemeButton type="submit" :disabled="busy">{{ c('save') }}</ThemeButton>
      </div>
    </form>
  </section>
</template>

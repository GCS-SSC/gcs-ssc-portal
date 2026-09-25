<script setup lang="ts">
import type { ResponseItem, SetSnapshot } from '~~/shared/schemas/agreements'
import type { LineBalance } from '~~/shared/types/agreements'
const props = defineProps<{ snapshot: SetSnapshot; balances: LineBalance[]; readonly: boolean }>()
const item = defineModel<Exclude<ResponseItem, { kind: 'survey' }>>({ required: true })
const { c, months } = useAgreementLocale(),
  { localized } = useGovernmentLocale()
const prefix = useId()
const budget = computed(
  () =>
    props.snapshot.agreement?.config.budgetLines.filter((line) =>
      item.value.lines.some((entry) => entry.budgetLineId === line.id)
    ) ?? []
)
const fiscalYear = computed(() => {
  const definition = props.snapshot.items.find((entry) => entry.item.id === item.value.id)?.item
  if (!definition || definition.kind === 'survey') return ''
  const year = props.snapshot.agreement?.config.fiscalYears.find(
    (entry) => entry.id === definition.fiscalYearId
  )
  return year ? `${year.startYear}–${year.startYear + 1}` : ''
})
const balanceFor = (id: string) => props.balances.find((line) => line.budgetLineId === id)
const fillZero = () => {
  for (const line of item.value.lines) if (!line.amount) line.amount = '0.00'
}
</script>
<template>
  <section>
    <PortalHeading tag="h2">{{ c(item.kind) }}</PortalHeading>
    <PortalText>
      {{ c('agreementNumber') }}: {{ snapshot.agreement?.agreementNumber }} · {{ c('fiscalYear') }}:
      {{ fiscalYear }}
    </PortalText>
    <PortalText>{{ c('balancesHint') }}</PortalText>
    <PortalText v-if="!readonly">{{ c('moneyHint') }}</PortalText>
    <PortalFieldset v-if="item.kind === 'claim'" class="portal-form" :legend="c('claim')">
      <PortalSelect
        :id="`${prefix}-start`"
        :disabled="readonly"
        :model-value="String(item.periodStart)"
        :label="c('periodStart')"
        :options="months"
        required
        @update:model-value="item.periodStart = Number($event)"
      />
      <PortalSelect
        :id="`${prefix}-end`"
        :disabled="readonly"
        :model-value="String(item.periodEnd)"
        :label="c('periodEnd')"
        :options="months"
        required
        @update:model-value="item.periodEnd = Number($event)"
      />
      <PortalSelect
        :id="`${prefix}-final`"
        :disabled="readonly"
        :model-value="item.isFinalForYear ? 'yes' : 'no'"
        :label="c('finalForYear')"
        :options="[
          { value: 'yes', label: c('yes') },
          { value: 'no', label: c('no') }
        ]"
        required
        @update:model-value="item.isFinalForYear = $event === 'yes'"
      />
    </PortalFieldset>
    <section v-for="line in budget" :key="line.id" class="content-section">
      <PortalHeading tag="h3">
        {{ localized(line) }} <span class="metadata">{{ line.currency.toUpperCase() }}</span>
      </PortalHeading>
      <PortalText>{{ line.costCategory }} / {{ line.costSubsection }}</PortalText>
      <dl class="balance-facts">
        <template
          v-for="field in [
            'budgetedAmount',
            'balance',
            'claimedAmount',
            'forecastAmount',
            'balanceAsOf'
          ] as const"
          :key="field"
          ><dt>{{ c(field) }}</dt>
          <dd>{{ balanceFor(line.id)?.[field] ?? c('unknown') }}</dd></template
        >
      </dl>
      <PortalNotice v-if="!balanceFor(line.id)?.available">{{ c('lineUnavailable') }}</PortalNotice>
      <PortalFieldset class="portal-form" :legend="`${c('amount')} — ${localized(line)}`">
        <template v-for="(entry, index) in item.lines" :key="index">
          <template v-if="entry.budgetLineId === line.id">
            <PortalInput
              v-if="'description' in entry"
              :id="`${prefix}-description-${index}`"
              v-model="entry.description"
              :disabled="readonly"
              :label="c('description')"
              required
              :maxlength="2000"
            />
            <PortalInput
              :id="`${prefix}-amount-${index}`"
              v-model="entry.amount"
              :disabled="readonly"
              :label="'month' in entry ? months[entry.month]!.label : c('amount')"
              required
              :maxlength="21"
            />
          </template>
        </template>
      </PortalFieldset>
    </section>
    <PortalButton v-if="!readonly" variant="secondary" @click="fillZero">{{
      c('fillZero')
    }}</PortalButton>
  </section>
</template>
<style scoped>
.balance-facts {
  display: grid;
  grid-template-columns: minmax(9rem, 1fr) 1fr;
  gap: 0.5rem 1rem;
  max-width: 44rem;
}
.balance-facts dt {
  font-weight: 700;
}
.balance-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
}
</style>

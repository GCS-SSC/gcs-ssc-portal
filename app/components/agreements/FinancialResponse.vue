<script setup lang="ts">
import type { ResponseItem, SetSnapshot } from '~~/shared/schemas/agreements'
import type { LineBalance } from '~~/shared/types/agreements'
import { formatCurrency } from '~/utils/financial-display'
const props = defineProps<{
  snapshot: SetSnapshot
  balances: LineBalance[]
  showBalances: boolean
  readonly: boolean
}>()
const item = defineModel<Exclude<ResponseItem, { kind: 'survey' }>>({ required: true })
const { c, months } = useAgreementLocale(),
  { localized } = useGovernmentLocale()
const { locale } = useLocale()
const clientReady = ref(false)
onMounted(() => (clientReady.value = true))
const focusedAmount = ref<number | null>(null)
const activeIndex = ref<number | null>(0)
const forecastQuarter = ref(0)
const activeForecastLineId = ref<string | null>(null)
const prefix = useId()
const definition = computed(
  () => props.snapshot.items.find((entry) => entry.item.id === item.value.id)?.item
)
const fiscalYearId = computed(() =>
  definition.value?.kind === 'survey' ? null : definition.value?.fiscalYearId
)
const budget = computed(
  () =>
    props.snapshot.agreement?.config.budgetLines.filter(
      (line) => line.fiscalYearId === fiscalYearId.value
    ) ?? []
)
const fiscalYear = computed(() => {
  const year = props.snapshot.agreement?.config.fiscalYears.find(
    (entry) => entry.id === fiscalYearId.value
  )
  return year ? `${year.startYear}–${year.startYear + 1}` : ''
})
const claim = computed(() => (item.value.kind === 'claim' ? item.value : null))
const forecast = computed(() => (item.value.kind === 'forecast' ? item.value : null))
const claimRows = computed(
  () =>
    claim.value?.lines.map((entry, index) => ({
      entry,
      index,
      line: budget.value.find((candidate) => candidate.id === entry.budgetLineId)
    })) ?? []
)
const selectedEntry = computed(() => claim.value?.lines[activeIndex.value ?? -1])
const selectedLine = computed(() =>
  budget.value.find((line) => line.id === selectedEntry.value?.budgetLineId)
)
const selectedForecastLine = computed(
  () => budget.value.find((line) => line.id === activeForecastLineId.value) ?? budget.value[0]
)
const isActiveForecastLine = (id: string) => selectedForecastLine.value?.id === id
const quarterMonths = (quarter: number) => months.value.slice(quarter * 3, quarter * 3 + 3)
const forecastMonths = computed(() => quarterMonths(forecastQuarter.value))
const forecastEntries = computed(
  () =>
    new Map(
      forecast.value?.lines.map((entry, index) => [
        `${entry.budgetLineId}:${entry.month}`,
        { entry, index }
      ]) ?? []
    )
)
const forecastEntry = (lineId: string, month: number) =>
  forecastEntries.value.get(`${lineId}:${month}`)
const forecastRows = computed(() => budget.value.map((line) => ({ line })))
const forecastColumns = computed(() => [
  { field: 'category', header: c('costCategory') },
  { field: 'subsection', header: c('costSubsection') },
  { field: 'line', header: c('budgetLine') },
  ...Array.from({ length: 4 }, (_, quarter) =>
    quarter === forecastQuarter.value
      ? quarterMonths(quarter).map((month) => ({
          field: `month${month.value}`,
          header: month.label
        }))
      : [{ field: `quarter${quarter}`, header: `${c('quarterTotal')} ${quarter + 1}` }]
  ).flat(),
  { field: 'actions', header: c('actions') }
])
const quarterOptions = computed(() =>
  Array.from({ length: 4 }, (_, quarter) => ({
    value: String(quarter),
    label: `${c('quarter')} ${quarter + 1} (${months.value[quarter * 3]!.label}–${months.value[quarter * 3 + 2]!.label})`
  }))
)
const quarterTotal = (lineId: string, quarter: number) => {
  const amounts = quarterMonths(quarter)
    .map((month) => forecastEntry(lineId, Number(month.value))?.entry.amount)
    .filter((amount): amount is string => !!amount)
  if (!amounts.length) return ''
  const cents = amounts.reduce(
    (total, amount) => {
      const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(amount)
      if (!match) return null
      const value = BigInt(match[2]!) * 100n + BigInt((match[3] ?? '').padEnd(2, '0'))
      return total === null ? null : total + (match[1] ? -value : value)
    },
    0n as bigint | null
  )
  if (cents === null) return ''
  const absolute = cents < 0n ? -cents : cents
  return `${cents < 0n ? '-' : ''}${absolute / 100n}.${String(absolute % 100n).padStart(2, '0')}`
}
const openForecastLine = async (id: string) => {
  activeForecastLineId.value = id
  await nextTick()
  document.getElementById('forecast-line-editor')?.focus()
}
const categories = computed(() =>
  [...new Set(budget.value.map((line) => line.costCategory))].map((value) => ({
    value,
    label: value
  }))
)
const subsections = computed(() =>
  [
    ...new Set(
      budget.value
        .filter((line) => line.costCategory === selectedLine.value?.costCategory)
        .map((line) => line.costSubsection)
    )
  ].map((value) => ({ value, label: value }))
)
const linesInSubsection = computed(() =>
  budget.value
    .filter(
      (line) =>
        line.costCategory === selectedLine.value?.costCategory &&
        line.costSubsection === selectedLine.value?.costSubsection
    )
    .map((line) => ({ value: line.id, label: localized(line) }))
)
const selectCategory = (category: string) => {
  const line = budget.value.find((candidate) => candidate.costCategory === category)
  if (selectedEntry.value && line) selectedEntry.value.budgetLineId = line.id
}
const selectSubsection = (subsection: string) => {
  const line = budget.value.find(
    (candidate) =>
      candidate.costCategory === selectedLine.value?.costCategory &&
      candidate.costSubsection === subsection
  )
  if (selectedEntry.value && line) selectedEntry.value.budgetLineId = line.id
}
const addItem = async () => {
  const line = budget.value[0]
  if (!claim.value || !line || claim.value.lines.length >= 200) return
  claim.value.lines.push({ budgetLineId: line.id, description: '', amount: '' })
  activeIndex.value = claim.value.lines.length - 1
  await nextTick()
  document.getElementById('claim-item-editor')?.focus()
}
const openItem = async (index: number) => {
  activeIndex.value = index
  await nextTick()
  document.getElementById('claim-item-editor')?.focus()
}
const removeItem = (index: number) => {
  if (!claim.value) return
  claim.value.lines.splice(index, 1)
  if (!claim.value.lines.length) activeIndex.value = null
  else if (activeIndex.value !== null && index < activeIndex.value) activeIndex.value--
  else activeIndex.value = Math.min(activeIndex.value ?? 0, claim.value.lines.length - 1)
}
const balanceFor = (id: string) => props.balances.find((line) => line.budgetLineId === id)
const displayBalance = (
  lineId: string,
  field: 'budgetedAmount' | 'balance' | 'claimedAmount' | 'forecastAmount' | 'balanceAsOf',
  currency: string
) => {
  const value = balanceFor(lineId)?.[field]
  if (!value) return c('unknown')
  if (field === 'balanceAsOf')
    return clientReady.value
      ? new Intl.DateTimeFormat(locale.value === 'fr' ? 'fr-CA' : 'en-CA', {
          dateStyle: 'medium',
          timeStyle: 'short'
        }).format(new Date(value))
      : ''
  return formatCurrency(value, currency, locale.value)
}
const displayAmount = (amount: string, currency: string, index: number) =>
  focusedAmount.value === index || !amount ? amount : formatCurrency(amount, currency, locale.value)
const updateAmount = (entry: { amount: string }, value: string) => {
  // The stored value remains the exact decimal string expected by the API.
  entry.amount = (locale.value === 'fr' ? value.replace(',', '.') : value).replace(/[^\d.-]/g, '')
}
</script>
<template>
  <section>
    <template v-if="item.kind === 'claim'">
      <PortalHeading v-if="snapshot.agreement?.config.claimInstruction" tag="h2">{{
        c('claimInstruction')
      }}</PortalHeading>
      <PortalText v-if="snapshot.agreement?.config.claimInstruction">{{
        snapshot.agreement.config.claimInstruction[locale]
      }}</PortalText>
    </template>
    <template v-else-if="forecast">
      <PortalHeading v-if="snapshot.agreement?.config.forecastInstruction" tag="h2">{{
        c('forecastInstruction')
      }}</PortalHeading>
      <PortalText v-if="snapshot.agreement?.config.forecastInstruction">{{
        snapshot.agreement.config.forecastInstruction[locale]
      }}</PortalText>
      <PortalText>
        {{ c('agreementNumber') }}: {{ snapshot.agreement?.agreementNumber }} ·
        {{ c('fiscalYear') }}:
        {{ fiscalYear }}
      </PortalText>
      <PortalText v-if="showBalances">{{ c('balancesHint') }}</PortalText>
      <PortalText v-if="!readonly">{{ c('moneyHint') }}</PortalText>
    </template>
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
    <template v-if="claim">
      <PortalTable
        :label="c('claimItems')"
        :rows="claimRows"
        :columns="[
          { field: 'category', header: c('costCategory') },
          { field: 'subsection', header: c('costSubsection') },
          { field: 'line', header: c('budgetLine') },
          { field: 'description', header: c('description') },
          { field: 'amount', header: c('amount') },
          { field: 'actions', header: c('actions') }
        ]"
      >
        <template #category="{ row }">{{ row.line?.costCategory ?? c('unknown') }}</template>
        <template #subsection="{ row }">{{ row.line?.costSubsection ?? c('unknown') }}</template>
        <template #line="{ row }">{{ row.line ? localized(row.line) : c('unknown') }}</template>
        <template #description="{ row }">{{ row.entry.description || c('notEntered') }}</template>
        <template #amount="{ row }">{{
          row.entry.amount && row.line
            ? formatCurrency(row.entry.amount, row.line.currency, locale)
            : c('notEntered')
        }}</template>
        <template #actions="{ row }">
          <div class="form-actions">
            <PortalButton size="small" variant="secondary" @click="openItem(row.index)"
              >{{ c(readonly ? 'viewItem' : 'editItem') }} {{ row.index + 1 }}</PortalButton
            >
            <PortalButton
              v-if="!readonly"
              size="small"
              variant="danger"
              @click="removeItem(row.index)"
              >{{ c('removeItem') }} {{ row.index + 1 }}</PortalButton
            >
          </div>
        </template>
      </PortalTable>
      <PortalText v-if="!claim.lines.length">{{ c('noClaimItems') }}</PortalText>
      <div v-if="!readonly" class="claim-table-actions">
        <PortalButton
          variant="secondary"
          :disabled="!budget.length || claim.lines.length >= 200"
          @click="addItem"
          >{{ c('addItem') }}</PortalButton
        >
      </div>
      <section
        v-if="selectedEntry && selectedLine"
        id="claim-item-editor"
        class="claim-item-editor"
        tabindex="-1"
      >
        <PortalHeading tag="h3">{{ c('item') }} {{ (activeIndex ?? 0) + 1 }}</PortalHeading>
        <PortalFieldset class="portal-form" :legend="c('claimItemDetails')">
          <PortalSelect
            :id="`${prefix}-category`"
            :key="String(activeIndex)"
            :model-value="selectedLine.costCategory"
            :disabled="readonly"
            :label="c('costCategory')"
            :options="categories"
            required
            @update:model-value="selectCategory"
          />
          <PortalSelect
            :id="`${prefix}-subsection`"
            :key="`${activeIndex}-${selectedLine.costCategory}`"
            :model-value="selectedLine.costSubsection"
            :disabled="readonly"
            :label="c('costSubsection')"
            :options="subsections"
            required
            @update:model-value="selectSubsection"
          />
          <PortalSelect
            :id="`${prefix}-line`"
            :key="`${activeIndex}-${selectedLine.costCategory}-${selectedLine.costSubsection}`"
            :model-value="selectedLine.id"
            :disabled="readonly"
            :label="c('budgetLine')"
            :options="linesInSubsection"
            required
            @update:model-value="selectedEntry.budgetLineId = $event"
          />
          <PortalInput
            :id="`${prefix}-description-${activeIndex}`"
            v-model="selectedEntry.description"
            :disabled="readonly"
            :label="c('description')"
            required
            :maxlength="2000"
          />
          <PortalInput
            :id="`${prefix}-amount-${activeIndex}`"
            :model-value="
              displayAmount(selectedEntry.amount, selectedLine.currency, activeIndex ?? 0)
            "
            :disabled="readonly"
            :label="c('amount')"
            inputmode="decimal"
            required
            :maxlength="25"
            @focus="focusedAmount = activeIndex"
            @blur="focusedAmount = null"
            @update:model-value="updateAmount(selectedEntry, $event)"
          />
        </PortalFieldset>
        <PortalHeading tag="h4"
          >{{ localized(selectedLine) }} {{ selectedLine.currency.toUpperCase() }}</PortalHeading
        >
        <dl v-if="showBalances" class="balance-facts">
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
            <dd>{{ displayBalance(selectedLine.id, field, selectedLine.currency) }}</dd></template
          >
        </dl>
        <PortalNotice v-if="showBalances && !balanceFor(selectedLine.id)?.available">{{
          c('lineUnavailable')
        }}</PortalNotice>
      </section>
    </template>
    <template v-if="forecast">
      <PortalHeading tag="h2">{{ c('forecastBreakdown') }}</PortalHeading>
      <div class="forecast-quarter-actions" role="group" :aria-label="c('quarter')">
        <PortalButton
          v-for="(quarter, index) in quarterOptions"
          :key="quarter.value"
          size="small"
          :variant="forecastQuarter === index ? 'primary' : 'secondary'"
          :disabled="forecastQuarter === index"
          @click="forecastQuarter = index"
          >{{ quarter.label }}</PortalButton
        >
      </div>
      <PortalTable
        :label="`${c('forecastBreakdown')} — ${quarterOptions[forecastQuarter]?.label}`"
        :rows="forecastRows"
        :columns="forecastColumns"
      >
        <template #category="{ row }">{{ row.line.costCategory }}</template>
        <template #subsection="{ row }">{{ row.line.costSubsection }}</template>
        <template #line="{ row }">
          <span
            class="forecast-line-indicator"
            :class="{ 'forecast-line-indicator--active': isActiveForecastLine(row.line.id) }"
          >
            {{ localized(row.line) }}
            <PortalScreenreaderOnly v-if="isActiveForecastLine(row.line.id)">
              — {{ c('currentlyEditing') }}
            </PortalScreenreaderOnly>
          </span>
        </template>
        <template v-for="month in months" :key="month.value" #[`month${month.value}`]="{ row }">
          {{
            forecastEntry(row.line.id, Number(month.value))?.entry.amount
              ? formatCurrency(
                  forecastEntry(row.line.id, Number(month.value))!.entry.amount,
                  row.line.currency,
                  locale
                )
              : c('notEntered')
          }}
        </template>
        <template v-for="quarter in [0, 1, 2, 3]" :key="quarter" #[`quarter${quarter}`]="{ row }">
          {{
            quarterTotal(row.line.id, quarter)
              ? formatCurrency(quarterTotal(row.line.id, quarter), row.line.currency, locale)
              : c('notEntered')
          }}
        </template>
        <template #actions="{ row }">
          <PortalButton
            size="small"
            variant="secondary"
            :aria-label="`${c(readonly ? 'view' : 'edit')} — ${localized(row.line)}`"
            @click="openForecastLine(row.line.id)"
          >
            {{ c(readonly ? 'view' : 'edit') }}
          </PortalButton>
        </template>
      </PortalTable>
      <section
        v-if="selectedForecastLine"
        id="forecast-line-editor"
        class="claim-item-editor forecast-line-editor"
        tabindex="-1"
      >
        <PortalHeading tag="h3"
          >{{ localized(selectedForecastLine) }}
          {{ selectedForecastLine.currency.toUpperCase() }}</PortalHeading
        >
        <dl class="forecast-line-facts">
          <dt>{{ c('costCategory') }}</dt>
          <dd>{{ selectedForecastLine.costCategory }}</dd>
          <dt>{{ c('costSubsection') }}</dt>
          <dd>{{ selectedForecastLine.costSubsection }}</dd>
          <dt>{{ c('budgetLine') }}</dt>
          <dd>{{ localized(selectedForecastLine) }}</dd>
        </dl>
        <PortalFieldset
          class="portal-form"
          :legend="`${c('forecastBreakdown')} — ${quarterOptions[forecastQuarter]?.label}`"
        >
          <template v-for="month in forecastMonths" :key="month.value">
            <PortalInput
              v-if="forecastEntry(selectedForecastLine.id, Number(month.value))"
              :id="`${prefix}-forecast-${selectedForecastLine.id}-${month.value}`"
              :model-value="
                displayAmount(
                  forecastEntry(selectedForecastLine.id, Number(month.value))!.entry.amount,
                  selectedForecastLine.currency,
                  forecastEntry(selectedForecastLine.id, Number(month.value))!.index
                )
              "
              :disabled="readonly"
              :label="`${month.label} — ${localized(selectedForecastLine)}`"
              inputmode="decimal"
              required
              :maxlength="25"
              @focus="
                focusedAmount = forecastEntry(selectedForecastLine.id, Number(month.value))!.index
              "
              @blur="focusedAmount = null"
              @update:model-value="
                updateAmount(
                  forecastEntry(selectedForecastLine.id, Number(month.value))!.entry,
                  $event
                )
              "
            />
          </template>
        </PortalFieldset>
        <dl v-if="showBalances" class="balance-facts">
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
            <dd>
              {{ displayBalance(selectedForecastLine.id, field, selectedForecastLine.currency) }}
            </dd></template
          >
        </dl>
        <PortalNotice v-if="showBalances && !balanceFor(selectedForecastLine.id)?.available">{{
          c('lineUnavailable')
        }}</PortalNotice>
      </section>
    </template>
  </section>
</template>
<style scoped>
.forecast-line-indicator {
  display: inline-block;
}
.forecast-line-indicator--active {
  background: var(--gcds-color-blue-50);
  border-inline-start: var(--gcds-border-width-lg) solid var(--gcds-color-blue-700);
  padding: var(--gcds-spacing-100);
}
.forecast-line-editor {
  border-inline-start: var(--gcds-border-width-lg) solid var(--gcds-color-blue-700);
  padding-inline-start: var(--gcds-spacing-300);
}
.forecast-line-facts {
  display: grid;
  grid-template-columns: minmax(9rem, 1fr) 1fr;
  gap: var(--gcds-spacing-100) var(--gcds-spacing-200);
  max-width: 44rem;
}
.forecast-line-facts dt {
  font-weight: 700;
}
.forecast-line-facts dd {
  margin: 0;
  overflow-wrap: anywhere;
}
.forecast-quarter-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--gcds-spacing-200);
  margin-block-end: var(--gcds-spacing-300);
}
.claim-table-actions {
  display: flex;
  justify-content: flex-end;
  margin-block-start: var(--gcds-spacing-300);
  margin-block-end: var(--gcds-spacing-300);
}
.claim-item-editor {
  margin-block-start: var(--gcds-spacing-400);
}
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

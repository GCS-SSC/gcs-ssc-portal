<script setup lang="ts">
import type { ResponseItem, SetSnapshot } from '~~/shared/schemas/agreements'
import type { LineBalance } from '~~/shared/types/agreements'
import { formatCurrency } from '~/utils/financial-display'
const props = defineProps<{ snapshot: SetSnapshot; balances: LineBalance[]; readonly: boolean }>()
const item = defineModel<Exclude<ResponseItem, { kind: 'survey' }>>({ required: true })
const { c, months } = useAgreementLocale(),
  { localized } = useGovernmentLocale()
const { locale } = useLocale()
const clientReady = ref(false)
onMounted(() => (clientReady.value = true))
const focusedAmount = ref<number | null>(null)
const activeIndex = ref<number | null>(0)
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
    <template v-else>
      <PortalHeading tag="h2">{{ c(item.kind) }}</PortalHeading>
      <PortalText>
        {{ c('agreementNumber') }}: {{ snapshot.agreement?.agreementNumber }} ·
        {{ c('fiscalYear') }}:
        {{ fiscalYear }}
      </PortalText>
      <PortalText>{{ c('balancesHint') }}</PortalText>
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
            <dd>{{ displayBalance(selectedLine.id, field, selectedLine.currency) }}</dd></template
          >
        </dl>
        <PortalNotice v-if="!balanceFor(selectedLine.id)?.available">{{
          c('lineUnavailable')
        }}</PortalNotice>
      </section>
    </template>
    <section
      v-for="line in item.kind === 'forecast' ? budget : []"
      :key="line.id"
      class="content-section"
    >
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
          <dd>{{ displayBalance(line.id, field, line.currency) }}</dd></template
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
              :model-value="displayAmount(entry.amount, line.currency, index)"
              :disabled="readonly"
              :label="'month' in entry ? months[entry.month]!.label : c('amount')"
              inputmode="decimal"
              required
              :maxlength="25"
              @focus="focusedAmount = index"
              @blur="focusedAmount = null"
              @update:model-value="updateAmount(entry, $event)"
            />
          </template>
        </template>
      </PortalFieldset>
    </section>
  </section>
</template>
<style scoped>
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

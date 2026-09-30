<script setup lang="ts">
import { parseTable, tableTotals, tableTotalsMode } from '@gcs-ssc/survey'
import type { AdvancedQuestion } from '@gcs-ssc/survey'
const rowTotalSlot = '$row-total'
const props = defineProps<{ question: Extract<AdvancedQuestion, { type: 'table' }>; value: string; label: string }>()
const { locale } = useLocale(), { s } = useSurveyLocale()
const rows = computed(() => parseTable(props.value, props.question.maxRows))
const totals = computed(() => tableTotals(props.question, rows.value))
const mode = computed(() => tableTotalsMode(props.question))
const columns = computed(() => [...props.question.columns.map(column => ({ field: column.id, header: column.label[locale.value] })), ...(['rows', 'both'].includes(mode.value) ? [{ field: '$row-total', header: s('rowTotal') }] : [])])
</script>
<template>
  <section>
    <PortalHeading tag="h3">{{ label }}</PortalHeading>
    <PortalTable v-if="rows.length" :label="label" :columns="columns" :rows="rows">
      <template v-for="column in question.columns" :key="column.id" #[column.id]="{ row }">{{ row.cells[column.id] || '—' }}</template>
      <template #[rowTotalSlot]="{ row }"><output>{{ totals.rows[row.id] ?? '—' }}</output></template>
    </PortalTable>
    <PortalText v-else>{{ s('noRows') }}</PortalText>
    <dl v-if="['columns', 'both'].includes(mode)">
      <template v-for="column in question.columns.filter(item => item.type === 'number')" :key="column.id"><dt>{{ column.label[locale] }} — {{ s('columnTotal') }}</dt><dd><output>{{ totals.columns[column.id] ?? '—' }}</output></dd></template>
    </dl>
  </section>
</template>

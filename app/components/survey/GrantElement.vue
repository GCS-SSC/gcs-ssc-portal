<script setup lang="ts">
import { nanoid } from 'nanoid'
import { activityFields, fundingFields, type ActivityRow, type BudgetRow, type GrantQuestion } from '@gcs-ssc/survey'
import { useGrantElement, type SurveyField } from '@gcs-ssc/survey/vue'
import { grantMessages } from '~/locales/grants'
import GrantInput from './GrantInput.vue'
const props = defineProps<{ field: SurveyField; prefix: string; legendSize?: 'h3' | 'h4' | 'h5' | 'h6'; readonly?: boolean }>()
const { locale } = useLocale()
const t = (key: string, values?: Record<string, string | number>) => {
  let message: string = grantMessages[locale.value][key as keyof typeof grantMessages.en]
  for (const [name, value] of Object.entries(values ?? {})) message = message.replaceAll(`{${name}}`, String(value))
  return message
}
const question = computed(() => props.field.question as GrantQuestion)
const editor = useGrantElement({ question, value: () => props.field.value, locale,
  showErrors: () => Boolean(props.field.error), disabled: () => props.field.disabled,
  createId: () => `r_${nanoid()}`, onChange: value => props.field.setValue(value) })
const rowId = (id: string, path: string) => `${props.prefix}-${props.field.id}-${id}-${path.replaceAll('.', '-')}`
const displayFields = (row: BudgetRow | ActivityRow) => props.readonly && question.value.type === 'activities'
  ? activityFields({ ...question.value.config, bilingual: true }, row as ActivityRow, locale.value)
    .filter(input => input.type === 'date' || input.value.trim())
  : editor.fields(row)
const budgetRow = (row: BudgetRow | ActivityRow) => row as BudgetRow
const activityRow = (row: BudgetRow | ActivityRow) => row as ActivityRow
const selections = computed(() => question.value.type !== 'activities' ? [] : [
  { path: 'outcomeIds' as const, label: 'grantOutcomes', options: question.value.config.outcomes, required: question.value.config.requireOutcomes },
  { path: 'responsiblePartyIds' as const, label: 'grantParties', options: question.value.config.responsibleParties, required: question.value.config.requireResponsibleParties }
])
const yearLabel = (id: string) => question.value.type === 'budget' ? question.value.config.fiscalYears.find(option => option.id === id)?.label[locale.value] ?? '—' : ''
const configured = computed(() => question.value.type === 'budget'
  ? Boolean(question.value.config.costItems.length && question.value.config.fiscalYears.length)
  : (!question.value.config.requireOutcomes || question.value.config.outcomes.length > 0)
    && (!question.value.config.requireResponsibleParties || question.value.config.responsibleParties.length > 0))
</script>
<template>
  <PortalFieldset :legend="field.label" :legend-size="legendSize ?? 'h4'" :hint="field.hint">
    <PortalText v-if="!readonly">{{ t(question.type === 'budget' ? 'grantSummaryHelp' : 'grantActivityHelp') }}</PortalText>
    <PortalNotice v-if="!configured" variant="info">{{ t('grantNotConfigured') }}</PortalNotice>
    <PortalNotice v-if="editor.issues.value.find(issue => !issue.path)" variant="error">{{ t(`grantError_${editor.issues.value.find(issue => !issue.path)!.code}`) }}</PortalNotice>
    <PortalText v-if="!editor.rows.value.length">{{ t('grantEmpty') }}</PortalText>
    <PortalFieldset
v-for="(row, index) in editor.rows.value" :key="row.id" class="grant-entry"
      :legend="t(question.type === 'budget' ? 'grantCostEntry' : 'grantActivityEntry', { number: index + 1 })" legend-size="h5">
      <PortalGrid columns="1" columns-tablet="2" gap="400">
        <GrantInput
v-for="input in displayFields(row)" :id="rowId(row.id, input.path)" :key="input.path" :input="input" :disabled="field.disabled" :readonly="readonly"
          :error="editor.error(index, input.path)" @change="editor.change(row.id, input.path, $event)" />
      </PortalGrid>
      <template v-if="question.type === 'activities'">
        <dl v-if="readonly" class="grant-selections">
          <template v-for="selection in selections" :key="selection.path">
            <dt>{{ t(selection.label) }}</dt>
            <dd>{{ selection.options.filter(option => activityRow(row)[selection.path].includes(option.id)).map(option => option.label[locale]).join(', ') || '—' }}</dd>
          </template>
        </dl>
        <PortalCheckboxGroup
v-for="selection in readonly ? [] : selections" :id="rowId(row.id, selection.path)" :key="selection.path"
          :label="t(selection.label)" :hint="t(selection.required ? 'grantSelectOne' : 'grantSelectOptional')" :required="selection.required"
          :disabled="field.disabled" :model-value="activityRow(row)[selection.path]"
          :options="selection.options.map(option => ({ value: option.id, label: option.label[locale] }))"
          :error="editor.error(index, selection.path) ? t(`grantError_${editor.error(index, selection.path)}`) : undefined"
          @toggle="(value, selected) => editor.toggle(row.id, selection.path, value, selected)" />
      </template>
      <div v-else>
        <PortalHeading tag="h6">{{ t('grantOtherFunding') }}</PortalHeading>
        <PortalFieldset
v-for="(source, sourceIndex) in budgetRow(row).otherFunding" :key="source.id"
          :legend="`${t('grantFundingSubtype')} ${sourceIndex + 1}`" legend-size="h6">
          <PortalGrid columns="1" columns-tablet="2" gap="400">
            <GrantInput
v-for="input in fundingFields(question.config, source, locale)" :id="rowId(source.id, input.path)" :key="input.path" :input="input" :disabled="field.disabled" :readonly="readonly"
              :error="editor.error(index, `otherFunding.${sourceIndex}.${input.path}`)" @change="editor.changeFunding(row.id, source.id, input.path, $event)" />
          </PortalGrid>
          <PortalButton v-if="!readonly" variant="secondary" :disabled="field.disabled" @click="editor.removeFunding(row.id, source.id)">{{ t('grantRemoveFunding') }}</PortalButton>
        </PortalFieldset>
        <PortalButton v-if="!readonly && question.config.fundingSubtypes.length" variant="secondary" :disabled="field.disabled || budgetRow(row).otherFunding.length >= 50" @click="editor.addFunding(row.id)">{{ t('grantAddFunding') }}</PortalButton>
      </div>
      <PortalButton v-if="!readonly" variant="secondary" :disabled="field.disabled" @click="editor.remove(row.id)">{{ t('grantRemoveEntry') }}</PortalButton>
    </PortalFieldset>
    <PortalButton v-if="!readonly" variant="secondary" :disabled="field.disabled || !configured || editor.rows.value.length >= question.config.maxRows" @click="editor.add">{{ t(question.type === 'budget' ? 'grantAddBudget' : 'grantAddActivity') }}</PortalButton>
    <div v-if="editor.totals.value.length" aria-live="polite">
      <PortalHeading tag="h5">{{ t('grantSummary') }}</PortalHeading>
      <template v-for="total in editor.totals.value" :key="`${total.fiscalYearId}:${total.currency}`">
        <PortalText><strong>{{ yearLabel(total.fiscalYearId) }} · {{ total.currency }}</strong></PortalText>
        <dl class="grant-totals">
          <template v-for="[label, value] in [[t('grantTotalCost'), total.totalCost], [t('grantProgramFunding'), total.programFunding], [t('grantOtherFunding'), total.otherFunding], [t('grantGap'), total.gap], [t('grantStackingTotal'), total.stacking], [t('grantCostSharingTotal'), total.costSharing]]" :key="label">
            <dt>{{ label }}</dt><dd>{{ value }}</dd>
          </template>
        </dl>
      </template>
      <PortalDetails :title="t('grantCategoryTotals')">
        <dl class="grant-totals">
          <template v-for="total in editor.categoryTotals.value" :key="`${total.fiscalYearId}:${total.currency}:${total.categoryId}`">
            <dt>{{ question.type === 'budget' ? question.config.categories.find(option => option.id === total.categoryId)?.label[locale] : '' }} · {{ yearLabel(total.fiscalYearId) }} · {{ total.currency }}</dt>
            <dd>{{ total.totalCost }}</dd>
          </template>
        </dl>
      </PortalDetails>
    </div>
  </PortalFieldset>
</template>
<style scoped>
.grant-entry { min-width: 0; margin-block: var(--gcds-spacing-400); }
.grant-selections { display: grid; gap: var(--gcds-spacing-100); margin-block: var(--gcds-spacing-200); }
.grant-selections dd { margin: 0 0 var(--gcds-spacing-200); overflow-wrap: anywhere; }
.grant-totals { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: var(--gcds-spacing-100) var(--gcds-spacing-400); margin-block: var(--gcds-spacing-200); }
.grant-totals dd { text-align: end; margin: 0; font-variant-numeric: tabular-nums; }
</style>

<script setup lang="ts">
import type { SurveyField } from '@gcs-ssc/survey/vue'
import { parseList, parseTable, type ListItem, type TableRow } from '@gcs-ssc/survey'
defineProps<{ fields: SurveyField[]; ids: string[]; prefix: string; legendSize?: 'h3' | 'h4' | 'h5' | 'h6' }>()
const { s, surveyError } = useSurveyLocale()
const { locale } = useLocale()
const change = (field: SurveyField, value: string) => field.setValue(value)
const newId = () => `r_${crypto.randomUUID().replaceAll('-', '_')}`
const listRows = (field: SurveyField) => parseList(field.value)
const tableRows = (field: SurveyField) => parseTable(field.value)
const updateList = (field: SurveyField, rows: ListItem[]) => change(field, JSON.stringify(rows))
const updateTable = (field: SurveyField, rows: TableRow[]) => change(field, JSON.stringify(rows))
const updateListValue = (field: SurveyField, id: string, value: string) =>
  updateList(
    field,
    listRows(field).map((row) => (row.id === id ? { ...row, value } : row))
  )
const updateCell = (field: SurveyField, rowId: string, columnId: string, value: string) =>
  updateTable(
    field,
    tableRows(field).map((row) =>
      row.id === rowId ? { ...row, cells: { ...row.cells, [columnId]: value } } : row
    )
  )
</script>
<template>
  <template v-for="id in ids" :key="id">
    <template v-for="field in fields.filter((item) => item.id === id)" :key="field.id">
      <PortalFieldset
        v-if="field.question.type === 'list'" class="survey-repeat"
        :legend="`${field.label}${field.required ? ` (${s('required')})` : ''}`"
        :legend-size="legendSize ?? 'h5'" :hint="field.hint">
        <PortalNotice v-if="field.error" variant="error">{{
          surveyError(field.error)
        }}</PortalNotice>
        <div v-for="(row, index) in listRows(field)" :key="row.id" class="survey-repeat-row">
          <PortalInput
            :id="`${prefix}-${field.id}-${row.id}`"
            :model-value="row.value"
            :label="`${field.label} ${index + 1}`"
            :required="true"
            :disabled="field.disabled"
            :maxlength="500"
            @update:model-value="updateListValue(field, row.id, $event)"
          />
          <PortalButton
            variant="secondary"
            :disabled="field.disabled"
            @click="
              updateList(
                field,
                listRows(field).filter((item) => item.id !== row.id)
              )
            "
          >
            {{ s('removeRow') }} {{ index + 1 }}
          </PortalButton>
        </div>
        <PortalButton
          variant="secondary"
          :disabled="field.disabled || listRows(field).length >= field.question.maxItems"
          @click="updateList(field, [...listRows(field), { id: newId(), value: '' }])"
        >
          {{ s('addItem') }}
        </PortalButton>
      </PortalFieldset>
      <PortalFieldset
        v-else-if="field.question.type === 'table'" class="survey-table"
        :legend="`${field.label}${field.required ? ` (${s('required')})` : ''}`"
        :legend-size="legendSize ?? 'h5'" :hint="field.hint">
        <PortalNotice v-if="field.error" variant="error">{{
          surveyError(field.error)
        }}</PortalNotice>
        <PortalText v-if="!tableRows(field).length">{{ s('noRows') }}</PortalText>
        <PortalTable
          v-else
          :label="s('tableRows')"
          :rows="tableRows(field)"
          :columns="[
            ...field.question.columns.map((column) => ({
              field: column.id,
              header: column.label[locale]
            })),
            { field: 'actions', header: s('actions') }
          ]"
        >
          <template
            v-for="column in field.question.columns"
            :key="column.id"
            #[column.id]="{ row }"
          >
            <PortalInput
              :id="`${prefix}-${field.id}-${row.id}-${column.id}`"
              :model-value="row.cells[column.id] ?? ''"
              :label="column.label[locale]"
              :required="column.required"
              :disabled="field.disabled"
              :maxlength="500"
              @update:model-value="updateCell(field, row.id, column.id, $event)"
            />
          </template>
          <template #actions="{ row }">
            <PortalButton
              variant="secondary"
              :disabled="field.disabled"
              @click="
                updateTable(
                  field,
                  tableRows(field).filter((item) => item.id !== row.id)
                )
              "
            >
              {{ s('removeRow') }}
            </PortalButton>
          </template>
        </PortalTable>
        <PortalButton
          variant="secondary"
          :disabled="field.disabled || tableRows(field).length >= field.question.maxRows"
          @click="updateTable(field, [...tableRows(field), { id: newId(), cells: {} }])"
        >
          {{ s('addRow') }}
        </PortalButton>
      </PortalFieldset>
      <div v-else-if="field.question.type === 'computed'" class="survey-computed">
        <PortalText
          ><strong>{{ field.label }}</strong
          >: {{ field.value || '—' }}</PortalText
        >
      </div>
      <PortalSelect
        v-else-if="field.question.type === 'select'"
        :id="`${prefix}-${field.id}`"
        :model-value="field.value"
        :label="field.label"
        :hint="field.hint"
        :required="field.required"
        :disabled="field.disabled"
        :options="[{ value: '', label: s('choose') }, ...field.options]"
        :error="surveyError(field.error)"
        @update:model-value="change(field, $event)"
      />
      <PortalInput
        v-else
        :id="`${prefix}-${field.id}`"
        :model-value="field.value"
        :label="field.label"
        :type="field.question.type === 'email' ? 'email' : 'text'"
        :hint="
          [
            field.hint,
            field.question.type === 'date'
              ? s('dateHint')
              : field.question.type === 'number'
                ? s('numberHint')
                : ''
          ]
            .filter(Boolean)
            .join(' ')
        "
        :required="field.required"
        :disabled="field.disabled"
        :maxlength="field.question.type === 'text' ? field.question.maxLength : 5000"
        :error="surveyError(field.error)"
        @update:model-value="change(field, $event)"
      />
    </template>
  </template>
</template>

<style scoped>
.survey-repeat-row {
  margin-block: var(--gcds-spacing-200);
}
.survey-repeat-row + :deep(gcds-button),
.survey-table :deep(gcds-button) {
  margin-top: var(--gcds-spacing-200);
}
</style>

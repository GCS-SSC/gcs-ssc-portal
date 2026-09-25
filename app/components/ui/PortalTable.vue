<script setup lang="ts" generic="T extends object">
import { GcdsTable } from '@gcds-core/components-vue'
import type { Ref } from 'vue'
import { defineCustomElement } from '@gcds-core/components/dist/components/gcds-table.js'

// Unlike the other Vue proxies, the 1.6 table slot wrapper does not register its element.
defineCustomElement()
const props = defineProps<{
  label: string
  rows: T[]
  columns: { field: string; header: string }[]
}>()
defineSlots<{ [name: string]: (props: { row: T }) => unknown }>()
const locale = inject<Ref<'en' | 'fr'>>('portal-locale', ref('en'))
const columns = computed(() => props.columns.map((column) => ({ ...column, slotted: true })))
// The 1.6 core table identifies rows by index, while its Vue wrapper prefers data.id.
// Supply matching presentation IDs; business identities stay in the original typed rows.
// All cell content stays in live Vue slots, including event handlers and validation.
const data = computed(() => props.rows.map((_row, index) => ({ id: String(index) })))
</script>
<template>
  <GcdsTable :columns="columns" :data="data" :lang="locale">
    <template #caption>
      <!-- eslint-disable-next-line vue/no-deprecated-slot-attribute -->
      <span slot="caption">{{ label }}</span>
    </template>
    <template v-for="column in columns" :key="column.field" #[column.field]="{ rowIndex }">
      <slot :name="column.field" :row="rows[rowIndex]!" />
    </template>
  </GcdsTable>
</template>

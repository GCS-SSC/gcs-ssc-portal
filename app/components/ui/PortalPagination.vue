<script setup lang="ts">
import { GcdsPagination } from '@gcds-core/components-vue'
import type { Ref } from 'vue'
const props = defineProps<{ label: string; page: number; totalPages: number; kind: string }>()
const locale = inject<Ref<'en' | 'fr'>>('portal-locale', ref('en'))
const url = computed(() => ({ queryStrings: { kind: props.kind, 'page::match': 1 } }))
</script>
<template>
  <GcdsPagination
    :lang="locale"
    :label="label"
    :current-page="page"
    :total-pages="totalPages"
    :url="url"
  />
</template>

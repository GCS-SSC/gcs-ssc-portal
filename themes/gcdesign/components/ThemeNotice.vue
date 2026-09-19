<script setup lang="ts">
import type { Ref } from 'vue'
import { GcdsNotice } from '@gcds-core/components-vue'
import type { ThemeNoticeProps } from '../../../shared/types/theme'

const props = defineProps<ThemeNoticeProps>()
const locale = inject<Ref<'en' | 'fr'>>('portal-theme-locale', ref('en'))
const noticeTitle = computed(
  () =>
    props.title ||
    (locale.value === 'fr'
      ? { info: 'Information', success: 'Confirmation', error: 'Erreur' }
      : { info: 'Information', success: 'Success', error: 'Error' })[props.variant ?? 'info']
)
</script>

<template>
  <GcdsNotice
    :notice-role="variant === 'error' ? 'danger' : (variant ?? 'info')"
    :lang="locale"
    :notice-title="noticeTitle"
    notice-title-tag="h2"
    :role="variant === 'error' ? 'alert' : 'status'"
    ><div><slot /></div
  ></GcdsNotice>
</template>

<script setup lang="ts">
import type { GrantInput, GrantIssue } from '@gcs-ssc/survey'
import { grantMessages } from '~/locales/grants'
defineProps<{ input: GrantInput; id: string; disabled: boolean; readonly?: boolean; error?: GrantIssue['code'] }>()
const emit = defineEmits<{ change: [value: string] }>()
const { locale } = useLocale()
const t = (key: string) => grantMessages[locale.value][key as keyof typeof grantMessages.en]
</script>
<template>
  <div class="grant-input">
  <dl v-if="readonly" class="grant-read-value">
    <dt><PortalText size="small" text-role="secondary">{{ t(input.label) }}</PortalText></dt>
    <dd><PortalText>{{ input.options?.find(option => option.value === input.value)?.label ?? (input.value || '—') }}</PortalText></dd>
  </dl>
  <PortalSelect
v-else-if="input.type === 'select'" :id="id" :model-value="input.value" :label="t(input.label)"
    :required="input.required" :disabled="disabled || input.readonly" :options="[{ value: '', label: t('grantChoose') }, ...(input.options ?? [])]"
    :error="error ? t(`grantError_${error}`) : undefined" @update:model-value="emit('change', $event)" />
  <PortalTextarea
v-else-if="input.type === 'textarea'" :id="id" :model-value="input.value" :label="t(input.label)" :rows="3"
    :required="input.required" :disabled="disabled" :maxlength="input.maxLength" :error="error ? t(`grantError_${error}`) : undefined" @update:model-value="emit('change', $event)" />
  <PortalInput
v-else :id="id" :model-value="input.value" :label="t(input.label)" type="text" :inputmode="input.type === 'money' || input.type === 'percentage' ? 'decimal' : undefined"
    :hint="input.type === 'money' && !input.readonly ? t('grantMoneyHint') : input.type === 'date' ? t('grantDateHint') : undefined"
    :required="input.required && !input.readonly" :disabled="disabled" :readonly="input.readonly" :maxlength="input.maxLength"
    :error="error ? t(`grantError_${error}`) : undefined" @update:model-value="emit('change', $event)" />
  </div>
</template>

<style scoped>
.grant-input { min-width: 0; }
.grant-input > * { max-width: 100%; }
.grant-read-value { margin: 0; }
.grant-read-value dd { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>

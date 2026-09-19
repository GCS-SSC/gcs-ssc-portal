<script setup lang="ts">
const model = defineModel<{ en: string; fr: string } | undefined>({ default: undefined })
const props = withDefaults(defineProps<{ prefix: string; maxLength?: number; help?: boolean }>(), {
  maxLength: 2000
})
const { s } = useSurveyLocale()
const change = (locale: 'en' | 'fr', value: string) => {
  const next = { en: model.value?.en ?? '', fr: model.value?.fr ?? '', [locale]: value }
  model.value = next.en || next.fr ? next : undefined
}
const required = computed(() => Boolean(model.value?.en || model.value?.fr))
</script>
<template>
  <ThemeInput
    :id="`${props.prefix}-en`"
    :model-value="model?.en ?? ''"
    :label="s(help ? 'hintEn' : 'descriptionEn')"
    :hint="s('bilingualOptional')"
    :required="required"
    :maxlength="maxLength"
    @update:model-value="change('en', $event)"
  />
  <ThemeInput
    :id="`${props.prefix}-fr`"
    :model-value="model?.fr ?? ''"
    :label="s(help ? 'hintFr' : 'descriptionFr')"
    :required="required"
    :maxlength="maxLength"
    @update:model-value="change('fr', $event)"
  />
</template>

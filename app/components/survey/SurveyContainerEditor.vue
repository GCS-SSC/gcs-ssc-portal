<script setup lang="ts">
import type { SurveyCondition, SurveyQuestion } from '@gcs-ssc/survey'
import SurveyDescriptionEditor from './SurveyDescriptionEditor.vue'
import SurveyConditionEditor from './SurveyConditionEditor.vue'
const model = defineModel<{
  id: string
  title: { en: string; fr: string }
  description?: { en: string; fr: string }
  visibleWhen?: SurveyCondition
}>({ required: true })
defineProps<{ sources?: SurveyQuestion[] }>()
const { s } = useSurveyLocale()
</script>
<template>
  <div class="portal-form">
    <ThemeInput
      :id="`${model.id}-title-en`"
      v-model="model.title.en"
      :label="s('headingEn')"
      :maxlength="200"
      required
    />
    <ThemeInput
      :id="`${model.id}-title-fr`"
      v-model="model.title.fr"
      :label="s('headingFr')"
      :maxlength="200"
      required
    />
    <SurveyDescriptionEditor v-model="model.description" :prefix="`${model.id}-description`" />
    <template v-if="sources">
      <h5>{{ s('visibility') }}</h5>
      <SurveyConditionEditor
        v-model="model.visibleWhen"
        :sources="sources"
        :prefix="`${model.id}-visibility`"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ResolvedAdvancedGroup } from '@gcs-ssc/survey'
import type { SurveyField } from '@gcs-ssc/survey/vue'
import SurveyFields from './SurveyFields.vue'
defineProps<{
  groups: ResolvedAdvancedGroup[]
  fields: SurveyField[]
  prefix: string
  depth?: number
  rootHeading?: 'h4' | 'h5'
}>()
const { locale } = useLocale()
</script>

<template>
  <section
    v-for="group in groups"
    :key="`${group.id}-${group.instanceId ?? 'single'}`"
    class="content-section"
    :aria-label="group.title[locale]"
  >
    <PortalHeading :tag="(depth ?? 0) > 0 ? (rootHeading === 'h4' ? 'h5' : 'h6') : (rootHeading ?? 'h5')">{{ group.title[locale] }}</PortalHeading>
    <PortalText v-if="group.description">{{ group.description[locale] }}</PortalText>
    <SurveyFields :fields="fields" :ids="group.questionIds" :prefix="prefix" legend-size="h6" />
    <SurveyGroups
      v-if="group.groups.length"
      :groups="group.groups"
      :fields="fields"
      :prefix="prefix"
      :depth="(depth ?? 0) + 1"
      :root-heading="rootHeading"
    />
  </section>
</template>

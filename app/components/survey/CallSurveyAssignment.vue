<script setup lang="ts">
import type { FundingCall } from '~~/shared/types/government'
import type { SurveySummary } from '~~/shared/types/survey'
const props = defineProps<{ call: FundingCall; surveys: SurveySummary[] }>()
const emit = defineEmits<{ saved: [] }>()
const { s } = useSurveyLocale(),
  { locale } = useLocale()
const api = usePortalApi(),
  message = useApiMessage()
const selected = ref(props.call.surveyId ?? 'none'),
  busy = ref(false),
  error = ref('')
watch(
  () => props.call.surveyId,
  (value) => {
    selected.value = value ?? 'none'
  }
)
const save = async () => {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const survey = props.surveys.find((item) => item.id === selected.value)
    if (selected.value !== 'none' && !survey) {
      error.value = s('choose')
      return
    }
    await api(`/api/government/calls/${props.call.id}/survey`, {
      method: 'PUT',
      body: { surveyId: survey?.id ?? null, revision: survey?.revision ?? null }
    })
    emit('saved')
  } catch (failure) {
    error.value = message(failure)
  } finally {
    busy.value = false
  }
}
</script>
<template>
  <section class="content-section">
    <h3>{{ call[locale === 'en' ? 'nameEn' : 'nameFr'] }}</h3>
    <p v-if="call.surveyId">
      {{ s('attached') }} {{ call.surveyRevision }} ·
      <ThemeLink :to="`/government/surveys/${call.surveyId}`">{{
        surveys.find((item) => item.id === call.surveyId)?.title[locale] || s('chooseForm')
      }}</ThemeLink>
    </p>
    <p v-if="call.published">{{ s('readonly') }}</p>
    <form v-else class="portal-form" @submit.prevent="save">
      <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice>
      <ThemeSelect
        :id="`call-form-${call.id}`"
        v-model="selected"
        :label="s('chooseForm')"
        :disabled="busy"
        :options="[
          { value: 'none', label: s('detach') },
          ...surveys.map((item) => ({
            value: item.id,
            label: `${item.title[locale]} (${s('revision')} ${item.revision})`
          }))
        ]"
      />
      <div class="form-actions">
        <ThemeButton type="submit" variant="secondary" :disabled="busy">{{
          s('attach')
        }}</ThemeButton>
      </div>
    </form>
  </section>
</template>

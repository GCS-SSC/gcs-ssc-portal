<script setup lang="ts">
import { surveySchema, type SurveyQuestion, type SurveyDefinition } from '@gcs-ssc/survey'
import { useSurveyDesigner } from '@gcs-ssc/survey/vue'
import type { SurveyRecord } from '~~/shared/types/survey'
import SurveyPreview from '~/components/survey/SurveyPreview.vue'
import SurveyQuestionEditor from '~/components/survey/SurveyQuestionEditor.vue'
import SurveyStructureEditor from '~/components/survey/SurveyStructureEditor.vue'
import SurveyDescriptionEditor from '~/components/survey/SurveyDescriptionEditor.vue'
definePageMeta({ key: (route) => `${route.params.id}-${route.query.agencyId ?? ''}` })
const route = useRoute(),
  api = usePortalApi(),
  message = useApiMessage()
const { a } = useAttachmentLocale()
const { s } = useSurveyLocale(),
  { locale, t } = useLocale()
const isNew = route.params.id === 'new'
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData(`survey-${route.params.id}`, () =>
  isNew
    ? Promise.resolve(null)
    : api<{ survey: SurveyRecord }>(`/api/government/surveys/${route.params.id}`)
)
const agencyId = computed(() => data.value?.survey.agencyId ?? String(route.query.agencyId ?? ''))
const initial: SurveyDefinition = data.value?.survey.definition ?? {
  schemaVersion: 1,
  title: { en: '', fr: '' },
  questions: []
}
const { definition, replace, add, update, remove, move, place } = useSurveyDesigner(initial)
const saved = ref(JSON.stringify(definition.value)),
  revision = ref(data.value?.survey.revision ?? 0)
const editing = ref<SurveyQuestion | null | undefined>(undefined),
  deleteId = ref('')
const busy = ref(false),
  error = ref(''),
  success = ref('')
const { user } = usePortalSession()
watch(
  () => data.value?.survey,
  (value) => {
    if (value && !dirty.value) {
      replace(value.definition)
      saved.value = JSON.stringify(definition.value)
      revision.value = value.revision
    }
  }
)
const dirty = computed(
  () => JSON.stringify(definition.value) !== saved.value || editing.value !== undefined
)
const containers = computed(() =>
  definition.value.pages.flatMap((page) => [
    page,
    ...page.sections.flatMap((section) => [section, ...section.subsections])
  ])
)
const containerOptions = computed(() =>
  definition.value.pages.flatMap((page, index) => {
    const pageLabel = `${s('page')} ${index + 1}: ${page.title[locale.value]}`
    return [
      { value: page.id, label: pageLabel },
      ...page.sections.flatMap((section) => {
        const sectionLabel = `${pageLabel} / ${section.title[locale.value]}`
        return [
          { value: section.id, label: sectionLabel },
          ...section.subsections.map((subsection) => ({
            value: subsection.id,
            label: `${sectionLabel} / ${subsection.title[locale.value]}`
          }))
        ]
      })
    ]
  })
)
const orderedIds = computed(() => containers.value.flatMap((container) => container.questionIds))
const orderedQuestions = computed(() =>
  orderedIds.value
    .map((id) => definition.value.questions.find((question) => question.id === id)!)
    .filter(Boolean)
)
const questionSources = computed(() => {
  const ids = editing.value
    ? orderedIds.value.slice(0, orderedIds.value.indexOf(editing.value.id))
    : (definition.value.pages[0]?.questionIds ?? [])
  return definition.value.questions.filter((question) => ids.includes(question.id))
})
const location = (id: string) =>
  containers.value.find((container) => container.questionIds.includes(id))
const atBoundary = (id: string, direction: -1 | 1) => {
  const ids = location(id)?.questionIds ?? []
  return direction === -1 ? ids.indexOf(id) === 0 : ids.indexOf(id) === ids.length - 1
}
const preview = computed(() => surveySchema.safeParse(definition.value))
const applyQuestion = (question: SurveyQuestion) => {
  if (editing.value) update(question)
  else add(question)
  editing.value = undefined
  success.value = ''
}
const removeQuestion = () => {
  if (!remove(deleteId.value)) error.value = s('referencedQuestion')
  deleteId.value = ''
}
const save = async () => {
  if (busy.value) return
  error.value = ''
  success.value = ''
  if (editing.value !== undefined) {
    error.value = s('unsavedQuestion')
    return
  }
  const parsed = surveySchema.safeParse(definition.value)
  if (!parsed.success) {
    error.value = s('invalidFlow')
    return
  }
  busy.value = true
  try {
    const result = await api<{ survey: SurveyRecord }>(
      isNew ? '/api/government/surveys' : `/api/government/surveys/${route.params.id}`,
      {
        method: isNew ? 'POST' : 'PUT',
        body: isNew
          ? { agencyId: agencyId.value, definition: parsed.data }
          : { expectedRevision: revision.value, definition: parsed.data }
      }
    )
    replace(result.survey.definition)
    saved.value = JSON.stringify(definition.value)
    revision.value = result.survey.revision
    success.value = s('saved')
    if (isNew) await navigateTo(`/government/surveys/${result.survey.id}`)
  } catch (failure) {
    error.value =
      (failure as { statusCode?: number }).statusCode === 409 ? s('conflict') : message(failure)
  } finally {
    busy.value = false
  }
}
const beforeUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
onBeforeRouteLeave(() => !user.value || !dirty.value || window.confirm(s('dirty')))
watch(editing, async (value) => {
  if (value !== undefined) {
    await nextTick()
    document.getElementById('question-en')?.focus()
  }
})
useHead(() => ({ title: s('designer') }))
</script>
<template>
  <section>
    <ThemeLink :to="`/government/surveys?agencyId=${agencyId}`">{{ s('back') }}</ThemeLink>
    <h1>{{ s('designer') }}</h1>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ message(loadError) }}
      <ThemeButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</ThemeButton></ThemeNotice
    >
    <template v-else>
      <p v-if="revision" class="metadata">{{ s('savedRevision') }} {{ revision }}</p>
      <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice
      ><ThemeNotice v-if="success" variant="success">{{ success }}</ThemeNotice>
      <div class="portal-form">
        <ThemeInput
          id="survey-title-en"
          v-model="definition.title.en"
          :label="s('titleEn')"
          :maxlength="200"
          required
          :disabled="busy"
        />
        <ThemeInput
          id="survey-title-fr"
          v-model="definition.title.fr"
          :label="s('titleFr')"
          :maxlength="200"
          required
          :disabled="busy"
        />
        <SurveyDescriptionEditor v-model="definition.description" prefix="survey-description" />
        <ThemeSelect
          id="survey-attachments"
          :label="a('allow')"
          :model-value="definition.attachments?.enabled ? 'yes' : 'no'"
          :options="[
            { value: 'no', label: a('no') },
            { value: 'yes', label: a('yes') }
          ]"
          @update:model-value="definition.attachments = { enabled: $event === 'yes' }"
        />
      </div>
      <SurveyStructureEditor v-if="editing === undefined" v-model="definition" />
      <section class="content-section">
        <h2>{{ s('questions') }}</h2>
        <p v-if="!definition.questions.length">{{ s('noQuestions') }}</p>
        <ol v-else class="survey-question-list">
          <li v-for="question in orderedQuestions" :key="question.id">
            <h3>{{ question.label[locale] }}</h3>
            <p>{{ s(question.type) }} · {{ s(question.required ? 'required' : 'optional') }}</p>
            <ThemeSelect
              :id="`location-${question.id}`"
              :model-value="location(question.id)?.id ?? ''"
              :label="`${s('placement')}: ${question.label[locale]}`"
              :options="containerOptions"
              required
              :disabled="busy || editing !== undefined"
              @update:model-value="place(question.id, $event)"
            />
            <div class="form-actions">
              <ThemeButton
                variant="link"
                :disabled="busy || editing !== undefined"
                @click="editing = question"
                >{{ s('edit')
                }}<span class="sr-only"> {{ question.label[locale] }}</span></ThemeButton
              >
              <ThemeButton
                variant="link"
                :disabled="busy || editing !== undefined || atBoundary(question.id, -1)"
                @click="move(question.id, -1)"
                >{{ s('up') }}</ThemeButton
              >
              <ThemeButton
                variant="link"
                :disabled="busy || editing !== undefined || atBoundary(question.id, 1)"
                @click="move(question.id, 1)"
                >{{ s('down') }}</ThemeButton
              >
              <ThemeButton
                variant="link"
                :disabled="busy || editing !== undefined"
                @click="deleteId = question.id"
                >{{ s('remove')
                }}<span class="sr-only"> {{ question.label[locale] }}</span></ThemeButton
              >
            </div>
          </li>
        </ol>
        <section v-if="deleteId" class="confirmation" aria-live="polite">
          <p>{{ s('deleteQuestion') }}</p>
          <div class="form-actions">
            <ThemeButton :disabled="busy" @click="removeQuestion">{{ s('confirm') }}</ThemeButton
            ><ThemeButton variant="secondary" @click="deleteId = ''">{{ s('cancel') }}</ThemeButton>
          </div>
        </section>
        <ThemeButton
          v-if="editing === undefined"
          variant="secondary"
          :disabled="busy || definition.questions.length >= 50"
          @click="editing = null"
          >{{ s('addQuestion') }}</ThemeButton
        >
        <SurveyQuestionEditor
          v-else
          :key="editing?.id ?? 'new'"
          :question="editing ?? undefined"
          :sources="questionSources"
          @save="applyQuestion"
          @cancel="editing = undefined"
        />
      </section>
      <div class="form-actions">
        <ThemeButton :disabled="busy || editing !== undefined" :loading="busy" @click="save">{{
          s('save')
        }}</ThemeButton>
      </div>
      <SurveyPreview v-if="preview.success" :definition="definition" />
      <p v-else>{{ s('noSavedPreview') }}</p>
    </template>
  </section>
</template>
<style scoped>
.survey-question-list {
  padding-left: 1.5rem;
}
.survey-question-list > li {
  padding: 1rem 0 1.5rem;
  border-bottom: 1px solid var(--portal-line);
}
</style>

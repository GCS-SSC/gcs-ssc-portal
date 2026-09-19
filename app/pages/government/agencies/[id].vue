<script setup lang="ts">
import CallSurveyAssignment from '~/components/survey/CallSurveyAssignment.vue'
import type { SurveySummary } from '~~/shared/types/survey'
import type { Agency, Program, Stream, FundingCall } from '~~/shared/types/government'
definePageMeta({ key: (route) => String(route.params.id) })
const id = String(useRoute().params.id)
const { g, localized } = useGovernmentLocale()
const { t } = useLocale()
const { s } = useSurveyLocale()
const { c } = useCaseLocale()
const api = usePortalApi(),
  message = useApiMessage()
const { busy, error, success, perform } = useGovernmentAction()
const {
  data,
  error: loadError,
  refresh
} = await useAsyncData(`agency-${id}`, () =>
  api<{ agency: Agency; programs: Program[]; streams: Stream[]; calls: FundingCall[] }>(
    `/api/government/agencies/${id}`
  )
)
const { data: surveyData, refresh: refreshSurveys } = await useAsyncData(
  `agency-surveys-${id}`,
  () => api<{ surveys: SurveySummary[] }>(`/api/government/agencies/${id}/surveys`)
)
const refreshForms = async () => {
  await Promise.all([refresh(), refreshSurveys()])
}
const tab = ref<'programs' | 'streams' | 'calls' | 'agency'>('programs')
const editor = reactive({
  id: '',
  nameEn: '',
  nameFr: '',
  parentId: '',
  startDate: '',
  endDate: ''
})
const confirmation = ref<FundingCall | null>(null)
const clear = () => {
  Object.assign(editor, {
    id: '',
    nameEn: '',
    nameFr: '',
    parentId: '',
    startDate: '',
    endDate: ''
  })
  confirmation.value = null
}
watch(tab, () => {
  clear()
  error.value = ''
  success.value = ''
  if (tab.value === 'agency' && data.value) Object.assign(editor, data.value.agency)
})
const programs = computed(() => [
  { value: '', label: g('select') },
  ...(data.value?.programs ?? []).map((p) => ({ value: p.id, label: localized(p) }))
])
const streams = computed(() => [
  { value: '', label: g('select') },
  ...(data.value?.streams ?? []).map((s) => ({
    value: s.id,
    label: `${localized(data.value!.programs.find((p) => p.id === s.programId)!)} — ${localized(s)}`
  }))
])
const heading = computed(() =>
  tab.value === 'agency'
    ? g('agency')
    : tab.value === 'programs'
      ? g('newProgram')
      : tab.value === 'streams'
        ? g('newStream')
        : g(editor.id ? 'editCall' : 'newCall')
)
const edit = async (item: Program | Stream | FundingCall) => {
  clear()
  Object.assign(editor, { id: item.id, nameEn: item.nameEn, nameFr: item.nameFr })
  if ('streamId' in item)
    Object.assign(editor, {
      parentId: item.streamId,
      startDate: item.startDate,
      endDate: item.endDate
    })
  else if ('programId' in item) editor.parentId = item.programId
  await nextTick()
  document.getElementById('structure-en')?.focus()
}
const save = () =>
  perform(async () => {
    const names = { nameEn: editor.nameEn, nameFr: editor.nameFr }
    let body: Record<string, unknown> = names
    if (tab.value === 'programs' && !editor.id) body = { ...names, agencyId: id }
    if (tab.value === 'streams' && !editor.id) body = { ...names, programId: editor.parentId }
    if (tab.value === 'calls')
      body = {
        ...names,
        streamId: editor.parentId,
        startDate: editor.startDate,
        endDate: editor.endDate
      }
    const collection = tab.value === 'agency' ? 'agencies' : tab.value
    await api(`/api/government/${collection}${editor.id ? `/${editor.id}` : ''}`, {
      method: editor.id ? (tab.value === 'calls' ? 'PUT' : 'PATCH') : 'POST',
      body
    })
    await refresh()
    if (tab.value !== 'agency') clear()
  })
const publish = (call: FundingCall) =>
  perform(async () => {
    await api(`/api/government/calls/${call.id}/publication`, {
      method: 'PATCH',
      body: { published: !call.published }
    })
    confirmation.value = null
    await refresh()
  })
useHead(() => ({ title: data.value ? localized(data.value.agency) : g('agency') }))
</script>
<template>
  <section>
    <ThemeLink to="/government">{{ g('back') }}</ThemeLink>
    <ThemeNotice v-if="loadError" variant="error"
      >{{ message(loadError) }}
      <ThemeButton variant="secondary" @click="refresh()">{{
        t('retry')
      }}</ThemeButton></ThemeNotice
    >
    <template v-else-if="data">
      <p class="eyebrow">{{ g('agency') }}</p>
      <h1>{{ localized(data.agency) }}</h1>
      <div class="workspace">
        <nav class="workspace-nav" :aria-label="g('agency')">
          <ThemeLink :to="`/government/cases?agencyId=${id}`">{{ c('cases') }}</ThemeLink>
          <ThemeLink :to="`/government/surveys?agencyId=${id}`">{{ s('surveys') }}</ThemeLink>
          <ThemeButton
            v-for="item in ['programs', 'streams', 'calls', 'agency'] as const"
            :key="item"
            variant="link"
            :aria-current="tab === item ? 'page' : undefined"
            @click="tab = item"
            >{{ g(item) }}</ThemeButton
          >
        </nav>
        <div class="workspace-body">
          <ThemeNotice v-if="error" variant="error">{{ error }}</ThemeNotice>
          <ThemeNotice v-if="success" variant="success">{{ success }}</ThemeNotice>
          <template v-if="tab === 'programs' || tab === 'streams'">
            <h2>{{ g(tab) }}</h2>
            <p v-if="!data[tab].length">{{ g(tab === 'programs' ? 'noPrograms' : 'noStreams') }}</p>
            <ul v-else class="service-list">
              <li v-for="item in data[tab]" :key="item.id">
                <strong>{{ localized(item) }}</strong>
                <span v-if="'programId' in item" class="table-secondary">{{
                  localized(data.programs.find((p) => p.id === item.programId)!)
                }}</span>
                <ThemeButton variant="link" :disabled="busy" @click="edit(item)"
                  >{{ g('edit') }}<span class="sr-only"> {{ localized(item) }}</span></ThemeButton
                >
              </li>
            </ul>
          </template>
          <template v-if="tab === 'calls'">
            <h2>{{ g('calls') }}</h2>
            <p>{{ g('publicationHint') }}</p>
            <section v-if="confirmation" class="confirmation" aria-live="polite">
              <h3>{{ g('confirmChange') }}</h3>
              <p>{{ g('publicationConfirm') }} {{ localized(confirmation) }}</p>
              <div class="form-actions">
                <ThemeButton :disabled="busy" @click="publish(confirmation)">{{
                  g('confirm')
                }}</ThemeButton
                ><ThemeButton variant="secondary" :disabled="busy" @click="confirmation = null">{{
                  g('cancel')
                }}</ThemeButton>
              </div>
            </section>
            <p v-if="!data.calls.length">{{ g('noCalls') }}</p>
            <div v-else class="table-scroll">
              <table>
                <caption class="sr-only">
                  {{
                    g('calls')
                  }}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">{{ g('calls') }}</th>
                    <th scope="col">{{ g('dates') }}</th>
                    <th scope="col">{{ g('status') }}</th>
                    <th scope="col">{{ t('actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="call in data.calls" :key="call.id">
                    <td>
                      <strong>{{ localized(call) }}</strong
                      ><span class="table-secondary"
                        >{{ localized({ nameEn: call.programNameEn, nameFr: call.programNameFr }) }}
                        /
                        {{
                          localized({ nameEn: call.streamNameEn, nameFr: call.streamNameFr })
                        }}</span
                      >
                    </td>
                    <td>{{ call.startDate }} – {{ call.endDate }}</td>
                    <td>
                      <ThemeBadge :tone="call.published ? 'success' : 'neutral'">{{
                        g(call.published ? 'published' : 'draft')
                      }}</ThemeBadge>
                    </td>
                    <td>
                      <ThemeButton
                        v-if="!call.published"
                        variant="link"
                        :disabled="busy"
                        @click="edit(call)"
                        >{{ g('edit') }}</ThemeButton
                      ><ThemeButton variant="link" :disabled="busy" @click="confirmation = call">{{
                        g(call.published ? 'unpublish' : 'publish')
                      }}</ThemeButton>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <section v-if="tab === 'calls' && data.calls.length" class="content-section">
            <h2>{{ s('surveys') }}</h2>
            <p>{{ s('pinned') }}</p>
            <ThemeLink :to="`/government/surveys?agencyId=${id}`">{{ s('designer') }}</ThemeLink>
            <CallSurveyAssignment
              v-for="call in data.calls"
              :key="call.id"
              :call="call"
              :surveys="surveyData?.surveys ?? []"
              @saved="refreshForms"
            />
          </section>
          <section
            v-if="
              tab === 'agency' ||
              tab === 'programs' ||
              (tab === 'streams' && data.programs.length) ||
              (tab === 'calls' && data.streams.length)
            "
            class="content-section"
          >
            <h2>{{ editor.id && tab !== 'agency' && tab !== 'calls' ? g('edit') : heading }}</h2>
            <form class="portal-form" @submit.prevent="save">
              <ThemeSelect
                v-if="tab === 'streams' && !editor.id"
                id="stream-program"
                v-model="editor.parentId"
                :label="g('program')"
                :options="programs"
                required
              />
              <ThemeSelect
                v-if="tab === 'calls'"
                id="call-stream"
                v-model="editor.parentId"
                :label="g('stream')"
                :options="streams"
                :disabled="!!editor.id"
                required
              />
              <ThemeInput
                id="structure-en"
                v-model="editor.nameEn"
                :label="g('nameEn')"
                :maxlength="200"
                required
              />
              <ThemeInput
                id="structure-fr"
                v-model="editor.nameFr"
                :label="g('nameFr')"
                :maxlength="200"
                required
              />
              <template v-if="tab === 'calls'"
                ><ThemeInput
                  id="call-start"
                  v-model="editor.startDate"
                  :label="g('startDate')"
                  :hint="g('dateHint')"
                  :maxlength="10"
                  required /><ThemeInput
                  id="call-end"
                  v-model="editor.endDate"
                  :label="g('endDate')"
                  :hint="g('dateHint')"
                  :maxlength="10"
                  required
              /></template>
              <div class="form-actions">
                <ThemeButton type="submit" :disabled="busy" :loading="busy">{{
                  editor.id ? g('save') : g('create')
                }}</ThemeButton
                ><ThemeButton
                  v-if="editor.id && tab !== 'agency'"
                  variant="secondary"
                  :disabled="busy"
                  @click="clear"
                  >{{ g('cancel') }}</ThemeButton
                >
              </div>
            </form>
          </section>
        </div>
      </div>
    </template>
  </section>
</template>
